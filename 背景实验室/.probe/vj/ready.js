(function () {
  var w = document.getElementById('frame').contentWindow;
  if (!w || !w.__camReady) return { ready: false, hasWin: !!w };
  var st = w.__placeState ? w.__placeState() : null;
  return {
    ready: true,
    frames: w.__camState ? w.__camState.frames : -1,
    placeReady: st ? st.ready : null,
    hasPlaceState: !!w.__placeState,
    hasPlaceApi: !!(w.__placeAdd && w.__setCam && w.__groundY)
  };
})()
