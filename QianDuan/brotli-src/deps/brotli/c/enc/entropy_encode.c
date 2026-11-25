/* Copyright 2010 Google Inc. All Rights Reserved.

   Distributed under MIT license.
   See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
*/

/* Entropy encoding (Huffman) utilities. */

#include "entropy_encode.h"

#include "../common/constants.h"
#include "../common/platform.h"

#if defined(__cplusplus) || defined(c_plusplus)
extern "C" {
#endif

const BROTLI_MODEL("small") size_t kBrotliShellGaps[] = {132, 57, 23, 10, 4, 1};

BROTLI_BOOL BrotliSetDepth(
    int p0, HuffmanTree* pool, uint8_t* depth, int max_depth) {
  int stack[16];
  int level = 0;
  int p = p0;
  BROTLI_DCHECK(max_depth <= 15);
  stack[0] = -1;
  while (BROTLI_TRUE) {
    if (pool[p].index_left_ >= 0) {
      level++;
      if (level > max_depth) return BROTLI_FALSE;
      stack[level] = pool[p].index_right_or_value_;
      p = pool[p].index_left_;
      continue;
    } else {
      depth[pool[p].index_right_or_value_] = (uint8_t)level;
    }
    while (level >= 0 && stack[level] == -1) level--;
    if (level < 0) return BROTLI_TRUE;
    p = stack[level];
    stack[level] = -1;
  }
}

/* Sort the root nodes, least popular first. */
static BROTLI_INLINE BROTLI_BOOL SortHuffmanTree(
    const HuffmanTree* v0, const HuffmanTree* v1) {
  if (v0->total_count_ != v1->total_count_) {
    return TO_BROTLI_BOOL(v0->total_count_ < v1->total_count_);
  }
  return TO_BROTLI_BOOL(v0->index_right_or_value_ > v1->index_right_or_value_);
}

/* This function will create a Huffman tree.

   The catch here is that the tree cannot be arbitrarily deep.
   Brotli specifies a maximum depth of 15 bits for "code trees"
   and 7 bits for "code length code trees."

   count_limit is the value that is to be faked as the minimum value
   and this minimum value is raised until the tree matches the
   maximum length requirement.

   This algorithm is not of excellent performance for very long data blocks,
   especially when population counts are longer than 2**tree_limit, but
   we are not planning to use this with extremely long blocks.

   See http://en.wikipedia.org/wiki/Huffman_coding */
void BrotliCreateHuffmanTree(const uint32_t* data,
                             const size_t length,
                             const int tree_limit,
                             HuffmanTree* tree,
                             uint8_t* depth) {
  uint32_t count_limit;
  HuffmanTree sentinel;
  InitHuffmanTree(&sentinel, BROTLI_UINT32_MAX, -1, -1);
  /* For block sizes below 64 kB, we never need to do a second iteration
     of this loop. Probably all of our block sizes will be smaller than
     that, so this loop is mostly of academic interest. If we actually
     would need this, we would be better off with the Katajainen algorithm. */
  for (count_limit = 1; ; count_limit *= 2) {
    size_t n = 0;
    size_t i;
    size_t j;
    size_t k;
    for (i = length; i != 0;) {
      --i;
      if (data[i]) {
        const uint32_t count = BROTLI_MAX(uint32_t, data[i], count_limit);
        InitHuffmanTree(&tree[n++], count, -1, (int16_t)i);
      }
    }

    if (n == 1) {
      depth[tree[0].index_right_or_value_] = 1;  /* Only one element. */
      break;
    }

    SortHuffmanTreeItems(tree, n, SortHuffmanTree);

    /* The nodes are:
       [0, n): the sorted leaf nodes that we start with.
       [n]: we add a sentinel here.
       [n + 1, 2n): new parent nodes are added here, starting from
                    (n+1). These are naturally in ascending order.
       [2n]: we add a sentinel at the end as well.
       There will be (2n+1) elements at the end. */
    tree[n] = sentinel;
    tree[n + 1] = sentinel;

    i = 0;      /* Points to the next leaf node. */
    j = n + 1;  /* Points to the next non-leaf node. */
    for (k = n - 1; k != 0; --k) {
      size_t left, right;
      if (tree[i].total_count_ <= tree[j].total_count_) {
        left = i;
        ++i;
      } else {
        left = j;
        ++j;
      }
      if (tree[i].total_count_ <= tree[j].total_count_) {
        right = i;
        ++i;
      } else {
        right = j;
        ++j;
      }

      {
        /* The sentinel node becomes the parent node. */
        size_t j_end = 2 * n - k;
        tree[j_end].total_count_ =
            tree[left].total_count_ + tree[right].total_count_;
        tree[j_end].index_left_ = (int16_t)left;
        tree[j_end].index_right_or_value_ = (int16_t)right;

        /* Add back the last sentinel node. */
        tree[j_end + 1] = sentinel;
      }
    }
    if (BrotliSetDepth((int)(2 * n - 1), &tree[0], depth, tree_limit)) {
      /* We need to pack the Huffman tree in tree_limit bits. If this was not
         successful, add fake entities to the lowest values and retry. */
      break;
    }
  }
}

static void Reverse(uint8_t* v, size_t start, size_t end) {
  --end;
  while (start < end) {
    uint8_t tmp = v[start];
    v[start] = v[end];
    v[end] = tmp;
    ++start;
    --end;
  }
}

static void BrotliWriteHuffmanTreeRepetitions(
    const uint8_t previous_value,
    const uint8_t value,
    size_t repetitions,
    size_t* tree_size,
    uint8_t* tree,
    uint8_t* extra_bits_data) {
  BROTLI_DCHECK(repetitions > 0);
  if (previous_value != value) {
    tree[*tree_size] = value;
    extra_bits_data[*tree_size] = 0;
    ++(*tree_size);
    --repetitions;
  }
  if (repetitions == 7) {
    tree[*tree_size] = value;
    extra_bits_data[*tree_size] = 0;
    ++(*tree_size);
    --repetitions;
  }
  if (repetitions < 3) {
    size_t i;
    for (i = 0; i < repetitions; ++i) {
      tree[*tree_size] = value;
      extra_bits_data[*tree_size] = 0;
      ++(*tree_size);
    }
  } else {
    size_t start = *tree_size;
    repetitions -= 3;
    while (BROTLI_TRUE) {
      tree[*tree_size] = BROTLI_REPEAT_PREVIOUS_CODE_LENGTH;
      extra_bits_data[*tree_size] = repetitions & 0x3;
      ++(*tree_size);
      repetitions >>= 2;
      if (repetitions == 0) {
        break;
      }
      --repetitions;
    }
    Reverse(tree, start, *tree_size);
    Reverse(extra_bits_data, start, *tree_size);
  }
}

static void BrotliWriteHuffmanTreeRepetitionsZeros(
    size_t repetitions,
    size_t* tree_size,
    uint8_t* tree,
    uint8_t* extra_bits_data) {
  if (repetitions == 11) {
    tree[*tree_size] = 0;
    extra_bits_data[*tree_size] = 0;
    ++(*tree_size);
    --repetitions;
  }
  if (repetitions < 3) {
    size_t i;
    for (i = 0; i < repetitions; ++i) {
      tree[*tree_size] = 0;
      extra_bits_data[*tree_size] = 0;
      ++(*tree_size);
    }
  } else {
    size_t start = *tree_size;
    repetitions -= 3;
    while (BROTLI_TRUE) {
      tree[*tree_size] = BROTLI_REPEAT_ZERO_CODE_LENGTH;
      extra_bits_data[*tree_size] = repetitions & 0x7;
      ++(*tree_size);
      repetitions >>= 3;
      if (repetitions == 0) {
        break;
      }
      --repetitions;
    }
    Reverse(tree, start, *tree_size);
    Reverse(extra_bits_data, start, *tree_size);
  }
}

void BrotliOptimizeHuffmanCountsForRle(size_t length, uint32_t* counts,
                                       uint8_t* good_for_rle) {
  size_t nonzero_count = 0;
  size_t stride;
  size_t limit;
  size_t sum;
  const size_t streak_limit = 1240;
  /* Let's make the Huffman code more compatible with RLE encoding. */
  size_t i;
  for (i = 0; i < length; i++) {
    if (counts[i]) {
      ++nonzero_count;
    }
  }
  if (nonzero_count < 16) {
    return;
  }
  while (length != 0 && counts[length - 1] == 0) {
    --length;
  }
  if (length == 0) {
    return;  /* All zeros. */
  }
  /* Now counts[0..length - 1] does not have trailing zeros. */
  {
    size_t nonzeros = 0;
    uint32_t smallest_nonzero = 1 << 30;
    for (i = 0; i < length; ++i) {
      if (counts[i] != 0) {
        ++nonzeros;
        if (smallest_nonzero > counts[i]) {
          smallest_nonzero = counts[i];
        }
      }
    }
    if (nonzeros < 5) {
      /* Small histogram will model it well. */
      return;
    }
    if (smallest_nonzero < 4) {
      size_t zeros = length - nonzeros;
      if (zeros < 6) {
        for (i = 1; i < length - 1; ++i) {
          if (counts[i - 1] != 0 && counts[i] == 0 && counts[i + 1] != 0) {
            counts[i] = 1;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 