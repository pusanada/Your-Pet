const idleImages = ["image/begin.png", "image/begin1-1.png", "image/begin1-2.png"];
const ACTION_LIMIT_PER_DAY = 5;
const STATUS_DRAIN_MS = 2 * 60 * 60 * 1000;
const SAVE_KEY = "yourpetCuteProjectState";

const actionImages = {
    eat: "image/eat.png",
    sleep: "image/sleep.png",
    toilet: "image/peep-poop.png",
    over: "image/over.png"
};

const state = {
    petName: "",
    startedAt: 0,
    eat: 80,
    sleep: 80,
    toilet: 0,
    isDead: false,
    currentAction: "egg",
    musicMuted: false,
    currentDay: 1,
    actionUses: {
        eat: 0,
        sleep: 0,
        toilet: 0
    }
};

const overlay = document.getElementById("overlay");
const nameForm = document.getElementById("nameForm");
const nameInput = document.getElementById("nameInput");
const petName = document.getElementById("petName");
const dayCounter = document.getElementById("dayCounter");
const petShell = document.getElementById("petShell");
const petImage = document.getElementById("petImage");
const message = document.getElementById("message");
const actions = document.querySelector(".actions");
const music = document.getElementById("music");
const clickSound = document.getElementById("clickSound");
const soundBtn = document.getElementById("soundBtn");

const bars = {
    eat: document.getElementById("eatBar"),
    sleep: document.getElementById("sleepBar"),
    toilet: document.getElementById("toiletBar")
};

const values = {
    eat: document.getElementById("eatValue"),
    sleep: document.getElementById("sleepValue"),
    toilet: document.getElementById("toiletValue")
};

let idleTimer;
let drainTimer;
let dayTimer;
let playTimer;

restoreGame();

nameForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const enteredName = nameInput.value.trim();
    if (!enteredName) {
        return;
    }

    state.petName = enteredName;
    state.startedAt = Date.now();
    state.currentAction = "egg";

    petName.textContent = enteredName;
    overlay.classList.add("hidden");
    message.textContent = `${enteredName} is ready to play.`;

    startMusic();
    petImage.src = idleImages[0];
    startIdleAnimation();
    startStatusDrain();
    updateDayCounter();
    updateActionButtons();
    saveGame();
    dayTimer = setInterval(updateDayCounter, 60000);
});

document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
        if (!state.petName || state.isDead) {
            return;
        }

        const action = button.dataset.action;
        if (!canUseAction(action)) {
            message.textContent = `${actionName(action)} limit reached. come back tomorrow.`;
            return;
        }

        state.actionUses[action] += 1;
        playClick();
        doAction(action);
    });
});

soundBtn.addEventListener("click", () => {
    state.musicMuted = !state.musicMuted;
    music.muted = state.musicMuted;
    soundBtn.classList.toggle("muted", state.musicMuted);

    if (!state.musicMuted && state.petName) {
        startMusic();
    }
});

petShell.addEventListener("click", playWithPet);
petShell.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        playWithPet();
    }
});

function doAction(action) {
    state.currentAction = action;
    stopIdleAnimation();

    if (action === "eat") {
        state.eat = clamp(state.eat + 5, 0, 100);
        petImage.src = actionImages.eat;
        message.textContent = `${state.petName} enjoyed the food. ${usesLeft(action)} feed left today.`;
        setTimeout(returnToIdle, 1800);
    }

    if (action === "sleep") {
        state.sleep = clamp(state.sleep + 5, 0, 100);
        petImage.src = actionImages.sleep;
        message.textContent = `${state.petName} is sleeping. ${usesLeft(action)} sleep left today.`;
    }

    if (action === "toilet") {
        state.toilet = clamp(state.toilet - 25, 0, 100);
        petImage.src = actionImages.toilet;
        message.textContent = `${state.petName} finished poop. ${usesLeft(action)} poop left today.`;
        setTimeout(returnToIdle, 1800);
    }

    updateStatus();
    updateActionButtons();
    checkGameOver();
    if (!state.isDead) {
        saveGame();
    }
}

function returnToIdle() {
    if (state.isDead || state.currentAction === "sleep") {
        return;
    }

    state.currentAction = "egg";
    petImage.src = idleImages[0];
    startIdleAnimation();
}

function startIdleAnimation() {
    stopIdleAnimation();
    idleTimer = setTimeout(nextIdleFrame, randomDelay());
}

function stopIdleAnimation() {
    clearTimeout(idleTimer);
}

function playWithPet() {
    if (!state.petName || state.isDead) {
        return;
    }

    clearTimeout(playTimer);
    stopIdleAnimation();
    playClick();
    state.currentAction = "play";

    petShell.classList.remove("pet-shake");
    void petShell.offsetWidth;
    petShell.classList.add("pet-shake");

    const playFrames = [...idleImages, actionImages.over];
    let frameIndex = 0;

    function showPlayFrame() {
        petImage.src = playFrames[frameIndex];
        frameIndex += 1;

        if (frameIndex < playFrames.length) {
            playTimer = setTimeout(showPlayFrame, 230);
            return;
        }

        playTimer = setTimeout(() => {
            petShell.classList.remove("pet-shake");
            state.currentAction = "egg";
            showIdleFrame();
            startIdleAnimation();
        }, 320);
    }

    showPlayFrame();
}

function nextIdleFrame() {
    if (state.isDead || state.currentAction !== "egg") {
        return;
    }

    showIdleFrame();
    idleTimer = setTimeout(nextIdleFrame, randomDelay());
}

function showIdleFrame() {
    const nextImage = idleImages[Math.floor(Math.random() * idleImages.length)];
    petImage.src = nextImage;
}

function randomDelay() {
    return Math.floor(Math.random() * 2000) + 3000;
}

function startStatusDrain() {
    clearInterval(drainTimer);
    drainTimer = setInterval(() => {
        if (state.isDead) {
            return;
        }

        state.eat = clamp(state.eat - 1, 0, 100);
        state.sleep = clamp(state.sleep - 1, 0, 100);
        state.toilet = clamp(state.toilet + 1, 0, 100);

        updateStatus();
        checkGameOver();
        if (!state.isDead) {
            saveGame();
        }
    }, STATUS_DRAIN_MS);
}

function updateDayCounter() {
    if (!state.startedAt) {
        dayCounter.textContent = "stack day 1";
        return;
    }

    const day = getStackDay();
    if (day !== state.currentDay) {
        resetDailyUses(day);
    }

    dayCounter.textContent = `stack day ${day}`;
}

function updateActionButtons() {
    document.querySelectorAll("[data-action]").forEach((button) => {
        const action = button.dataset.action;
        button.textContent = `${actionName(action)} ${usesLeft(action)}`;
        button.disabled = state.isDead || !canUseAction(action);
    });
}

function updateStatus() {
    Object.keys(bars).forEach((key) => {
        bars[key].style.width = `${state[key]}%`;
        values[key].textContent = state[key];
    });
}

function checkGameOver() {
    if (state.eat > 0 && state.sleep > 0 && state.toilet < 100) {
        return;
    }

    state.isDead = true;
    state.currentAction = "over";
    stopIdleAnimation();
    clearInterval(drainTimer);
    clearInterval(dayTimer);
    petImage.src = actionImages.over;
    actions.classList.add("hidden");
    message.classList.add("game-over");
    message.textContent = `${state.petName} is gone. Refresh to try again.`;
    localStorage.removeItem(SAVE_KEY);
}

function startMusic() {
    music.volume = 0.45;
    music.play().catch(() => {
        message.textContent = `${state.petName} is ready. Tap Sound On if music does not start.`;
    });
}

function playClick() {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function canUseAction(action) {
    return state.actionUses[action] < ACTION_LIMIT_PER_DAY;
}

function usesLeft(action) {
    return Math.max(0, ACTION_LIMIT_PER_DAY - state.actionUses[action]);
}

function actionName(action) {
    if (action === "eat") {
        return "feed";
    }

    if (action === "toilet") {
        return "poop";
    }

    return action;
}

function getStackDay() {
    return Math.floor((Date.now() - state.startedAt) / 86400000) + 1;
}

function resetDailyUses(day) {
    state.currentDay = day;
    state.actionUses = {
        eat: 0,
        sleep: 0,
        toilet: 0
    };
    message.textContent = `stack day ${day}. actions reset.`;
    updateActionButtons();
    saveGame();
}

function saveGame() {
    if (!state.petName) {
        return;
    }

    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function restoreGame() {
    const savedState = localStorage.getItem(SAVE_KEY);
    if (!savedState) {
        return;
    }

    try {
        Object.assign(state, JSON.parse(savedState));
        state.actionUses = Object.assign({ eat: 0, sleep: 0, toilet: 0 }, state.actionUses);
    } catch {
        localStorage.removeItem(SAVE_KEY);
        return;
    }

    if (!state.petName) {
        return;
    }

    if (state.isDead) {
        localStorage.removeItem(SAVE_KEY);
        return;
    }

    petName.textContent = state.petName;
    overlay.classList.add("hidden");
    petImage.src = idleImages[0];
    updateStatus();
    updateDayCounter();
    updateActionButtons();

    message.textContent = `${state.petName} is back.`;
    startIdleAnimation();
    startStatusDrain();
    dayTimer = setInterval(updateDayCounter, 60000);
}

updateStatus();
