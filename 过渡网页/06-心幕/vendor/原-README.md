# 🚀 Barba.js Series – 08 Dynamic Grid Transition

This project is part of my Beginner → Advanced Barba.js Series, where each project progressively explores more sophisticated page transition techniques inspired by modern creative websites and award-winning digital experiences.

👉 In this project, I explore a Dynamic Grid Curtain Transition, where multiple rows of independently animated grid tiles expand from alternating directions to cover the viewport before revealing the next page through a synchronized curtain-opening sequence.

---

## 📌 Overview

Instead of relying on traditional overlays or fullscreen wipes, this transition introduces a multi-layer grid curtain system composed of 60 independently animated tiles distributed across four horizontal layers.

As users navigate between pages, alternating rows of tiles reveal from opposite directions, gradually covering the viewport while the current page subtly scales in the background.

Once the next page has been loaded, the curtain opens using the same alternating choreography, creating a smooth and cinematic transition between experiences.

💡 This approach:

* Creates a modular grid-based transition system
* Produces stronger visual rhythm through directional contrast
* Adds depth through synchronized page scaling
* Mimics transition systems commonly found on modern portfolio websites
* Turns navigation into a visual storytelling experience

---

## 🆕 What's New in This Project

✨ Four-layer dynamic grid architecture

✨ Alternating directional reveal choreography

✨ Clip-path driven tile animations

✨ Full viewport curtain coverage

✨ Cinematic page zoom synchronization

✨ Seamless Barba.js integration

✨ Modular and scalable transition structure

✨ Creative-studio inspired motion language

---

## ⚙️ How the Transition Works

1. User clicks a navigation link
2. The current page begins scaling outward
3. Grid tiles reveal from alternating directions
4. All four layers progressively cover the viewport
5. Barba.js swaps the page content
6. The incoming page begins scaling back into place
7. Grid tiles retract outward
8. The next page is fully revealed

👉 Creates a structured curtain effect rather than a conventional page transition.

---

## 🔹 Animation Philosophy

The goal wasn't simply to hide a page change.

Instead, the transition behaves as a modular motion system that temporarily transforms the viewport into a dynamic visual layer.

By alternating the reveal directions of each row, the grid creates tension and movement throughout the entire viewport rather than focusing motion in a single direction.

The result feels more architectural and intentional than traditional fullscreen overlays.

Rather than interrupting navigation, the transition becomes part of the overall browsing experience.

---

## 🔹 GSAP Setup

```js
const layer1 = document.querySelectorAll(".layer-1");
const layer2 = document.querySelectorAll(".layer-2");
const layer3 = document.querySelectorAll(".layer-3");
const layer4 = document.querySelectorAll(".layer-4");

gsap.set(layer1, { clipPath: "inset(0% 0% 0% 101%)" });
gsap.set(layer2, { clipPath: "inset(0% 101% 0% 0%)" });
gsap.set(layer3, { clipPath: "inset(0% 0% 0% 101%)" });
gsap.set(layer4, { clipPath: "inset(0% 101% 0% 0%)" });
```

📍 Layers 1 and 3 start hidden from the right

📍 Layers 2 and 4 start hidden from the left

📍 Alternating directions create stronger visual contrast

📍 Prepared for curtain-style viewport coverage

📍 Optimized for smooth clip-path animation

---

## 🔹 Curtain Entry (Page Exit)

```js
function curtainEntry() {
    const tl = gsap.timeline();

    tl.to(layer1,{
        clipPath:"inset(0% 0% 0% 0%)",
        duration:0.9,
        stagger:{
            amount:0.5,
            from:"end"
        }
    },0);

    tl.to(layer2,{
        clipPath:"inset(0% 0% 0% 0%)",
        duration:0.9,
        stagger:{
            amount:0.5,
            from:"start"
        }
    },0);

    tl.to(layer3,{
        clipPath:"inset(0% 0% 0% 0%)",
        duration:0.9,
        stagger:{
            amount:0.5,
            from:"end"
        }
    },0);

    tl.to(layer4,{
        clipPath:"inset(0% 0% 0% 0%)",
        duration:0.9,
        stagger:{
            amount:0.5,
            from:"start"
        }
    },0);

    return tl;
}
```

✔️ Grid tiles progressively cover the viewport

✔️ Alternating reveal directions increase motion complexity

✔️ Creates anticipation before page navigation

✔️ Establishes a dynamic curtain effect

---

## 🔹 Curtain Exit (Page Enter)

```js
function curtainExit() {
    const tl = gsap.timeline();

    tl.to(layer1,{
        clipPath:"inset(0% 0% 0% 101%)"
    },0);

    tl.to(layer2,{
        clipPath:"inset(0% 101% 0% 0%)"
    },0);

    tl.to(layer3,{
        clipPath:"inset(0% 0% 0% 101%)"
    },0);

    tl.to(layer4,{
        clipPath:"inset(0% 101% 0% 0%)"
    },0);

    return tl;
}
```

✔️ Reveals the incoming page smoothly

✔️ Maintains directional consistency

✔️ Produces a clean curtain-opening effect

✔️ Preserves motion continuity between pages

---

## 🔹 Page Scaling System

Alongside the grid animation, both pages participate in the transition through subtle scaling.

### ▶️ Current Page Exit

```js
function pageLeave(container){
    return gsap.to(container,{
        scale:1.1,
        duration:1.3
    });
}
```

✔️ Creates visual depth

✔️ Enhances perceived motion

✔️ Makes the transition feel more cinematic

---

### ▶️ Incoming Page Reveal

```js
function pageEnter(container){
    return gsap.fromTo(
        container,
        {
            scale:1.1
        },
        {
            scale:1
        }
    );
}
```

✔️ Smoothly restores the viewport

✔️ Creates continuity between pages

✔️ Avoids abrupt content changes

---

## 🔹 Barba.js Integration

```js
barba.init({
    transitions:[{
        name:"curtain-reveal",

        leave(data){
            const tl = gsap.timeline();

            tl.add(pageLeave(data.current.container),0);
            tl.add(curtainEntry(),0);

            return tl;
        },

        enter(data){
            const tl = gsap.timeline();

            tl.add(curtainExit(),0);
            tl.add(pageEnter(data.next.container),0.1);

            return tl;
        }
    }]
});
```

### 🧠 Transition Flow

### ▶️ Leave Phase (Current Page Exit)

During navigation, the current page begins scaling outward while the grid curtain simultaneously expands across the viewport.

```js
tl.add(pageLeave(data.current.container),0);
tl.add(curtainEntry(),0);
```

✔️ Creates anticipation

✔️ Synchronizes page and transition motion

✔️ Delivers a cinematic exit experience

---

### ▶️ Enter Phase (Next Page Reveal)

After the next page loads, the curtain retracts while the incoming page scales naturally back into place.

```js
tl.add(curtainExit(),0);
tl.add(pageEnter(data.next.container),0.1);
```

✔️ Maintains visual continuity

✔️ Produces a smooth reveal

✔️ Creates a polished navigation experience

---

### 📍 Complete Sequence

1. User clicks a navigation link
2. Current page scales outward
3. Grid tiles begin revealing from alternating directions
4. All four layers cover the viewport
5. Barba.js swaps page content
6. Grid curtain begins opening
7. New page scales into place
8. Tiles fully retract
9. New page becomes visible

👉 The final result feels more like a cinematic curtain system than a traditional page transition.

---

## 🧱 HTML Structure

```html
<div id="transition-wrapper">

    <div id="layer-1">
        <div class="layer-1"></div>
        ...
    </div>

    <div id="layer-2">
        <div class="layer-2"></div>
        ...
    </div>

    <div id="layer-3">
        <div class="layer-3"></div>
        ...
    </div>

    <div id="layer-4">
        <div class="layer-4"></div>
        ...
    </div>

</div>
```

---

## 🎨 CSS Structure

```css
#transition-wrapper{
    position:fixed;
    inset:0;
    z-index:9999;
    pointer-events:none;
}

#layer-1,
#layer-2,
#layer-3,
#layer-4{
    height:25vh;
    display:flex;
}

.layer-1,
.layer-2,
.layer-3,
.layer-4{
    width:calc(6.6% + 2px);
    height:105%;
    background:#FFE52A;
}
```

📍 Ensures:

* Full-screen viewport coverage
* Modular layer architecture
* Reliable tile alignment
* Smooth animation performance
* Scalable transition design
* Production-ready implementation

---

## 🧠 Key Takeaways

* Clip-path animations can create richer reveals than traditional transforms
* Alternating directions increase perceived complexity
* Multi-layer systems create stronger visual rhythm
* Small scaling details improve perceived quality
* GSAP timelines provide precise orchestration
* Barba.js enables seamless page navigation
* Transition systems can become part of the user experience
* Motion design can elevate even simple navigation interactions

---

## ✍️ Author

### Nischint Singh

🔗 LinkedIn:
https://www.linkedin.com/in/nischint-singh-98a329314/

