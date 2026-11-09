const layer1 = document.querySelectorAll(".layer-1");
const layer2 = document.querySelectorAll(".layer-2");
const layer3 = document.querySelectorAll(".layer-3");
const layer4 = document.querySelectorAll(".layer-4");

gsap.set(layer1, { clipPath: "inset(0% 0% 0% 101%)" });
gsap.set(layer2, { clipPath: "inset(0% 101% 0% 0%)" });
gsap.set(layer3, { clipPath: "inset(0% 0% 0% 101%)" });
gsap.set(layer4, { clipPath: "inset(0% 101% 0% 0%)" });

function curtainEntry() {
    const tl = gsap.timeline();

    tl.to(layer1, {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 0.9,
        stagger: {
            amount: 0.5,
            from: "end"
        },
        ease: "power3.inOut"
    }, 0);

    tl.to(layer2, {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 0.9,
        stagger: {
            amount: 0.5,
            from: "start"
        },
        ease: "power3.inOut"
    }, 0);

    tl.to(layer3, {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 0.9,
        stagger: {
            amount: 0.5,
            from: "end"
        },
        ease: "power3.inOut"
    }, 0);

    tl.to(layer4, {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 0.9,
        stagger: {
            amount: 0.5,
            from: "start"
        },
        ease: "power3.inOut"
    }, 0);

    return tl;
}

function curtainExit() {
    const tl = gsap.timeline();

    tl.to(layer1, {
        clipPath: "inset(0% 0% 0% 101%)",
        duration: 0.8,
        stagger: {
            amount: 0.5,
            from: "end"
        },
        ease: "power4.inOut"
    }, 0);

    tl.to(layer2, {
        clipPath: "inset(0% 101% 0% 0%)",
        duration: 0.8,
        stagger: {
            amount: 0.5,
            from: "start"
        },
        ease: "power4.inOut"
    }, 0);

    tl.to(layer3, {
        clipPath: "inset(0% 0% 0% 101%)",
        duration: 0.8,
        stagger: {
            amount: 0.5,
            from: "end"
        },
        ease: "power4.inOut"
    }, 0);

    tl.to(layer4, {
        clipPath: "inset(0% 101% 0% 0%)",
        duration: 0.8,
        stagger: {
            amount: 0.5,
            from: "start"
        },
        ease: "power4.inOut"
    }, 0);

    return tl;
}

function pageLeave(container) {
    return gsap.to(container, {
        scale: 1.1,
        duration: 1.3,
        ease: "power4.inOut",
        transformOrigin: "center center"
    });
}

function pageEnter(container) {
    return gsap.fromTo(
        container,
        {
            scale: 1.1,
        },
        {
            scale: 1,
            duration: 1.2,
            ease: "power3.inOut",
            clearProps: "transform"
        }
    );
}

barba.init({
    transitions: [{
        name: "curtain-reveal",

        leave(data) {
            const tl = gsap.timeline();

            tl.add(pageLeave(data.current.container), 0);
            tl.add(curtainEntry(), 0);

            return tl;
        },

        enter(data) {
            const tl = gsap.timeline();

            tl.add(curtainExit(), 0);
            tl.add(pageEnter(data.next.container), 0.1);

            return tl;
        }
    }]
});