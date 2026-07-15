export const clamp = (value, minimum, maximum) => {
    if (!Number.isFinite(value))
        return minimum;
    return Math.min(maximum, Math.max(minimum, value));
};
export const clamp01 = (value) => clamp(value, 0, 1);
export const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;
export const sanitizeVec3 = (value, fallback = [0, 0, 0]) => {
    if (!value || value.length !== 3)
        return fallback;
    return [
        Number.isFinite(value[0]) ? value[0] : fallback[0],
        Number.isFinite(value[1]) ? value[1] : fallback[1],
        Number.isFinite(value[2]) ? value[2] : fallback[2],
    ];
};
export const normalizeDirection = (value, fallback) => {
    const vector = sanitizeVec3(value, fallback);
    const length = Math.hypot(vector[0], vector[1], vector[2]);
    if (!Number.isFinite(length) || length < 1e-6)
        return fallback;
    return [vector[0] / length, vector[1] / length, vector[2] / length];
};
export const sanitizeRampMs = (value, fallback = 0) => Number.isFinite(value) ? Math.max(0, value) : Math.max(0, fallback);
export const automate = (parameter, value, context, rampMs = 30) => {
    const target = Number.isFinite(value) ? value : 0;
    const duration = sanitizeRampMs(rampMs);
    const now = context.currentTime;
    if (typeof parameter.cancelAndHoldAtTime === "function") {
        parameter.cancelAndHoldAtTime(now);
    }
    else {
        parameter.cancelScheduledValues(now);
        const current = Number.isFinite(parameter.value) ? parameter.value : target;
        parameter.setValueAtTime(current, now);
    }
    if (duration === 0)
        parameter.setValueAtTime(target, now);
    else
        parameter.linearRampToValueAtTime(target, now + duration / 1_000);
};
const hasThreeParams = (first, second, third) => first !== undefined && second !== undefined && third !== undefined;
export const setPositionParams = (node, position, context, rampMs) => {
    const compatible = node;
    if (hasThreeParams(compatible.positionX, compatible.positionY, compatible.positionZ)) {
        automate(compatible.positionX, position[0], context, rampMs);
        automate(compatible.positionY, position[1], context, rampMs);
        automate(compatible.positionZ, position[2], context, rampMs);
        return;
    }
    compatible.setPosition(position[0], position[1], position[2]);
};
export const setOrientationParams = (node, orientation, context, rampMs) => {
    const compatible = node;
    if (hasThreeParams(compatible.orientationX, compatible.orientationY, compatible.orientationZ)) {
        automate(compatible.orientationX, orientation[0], context, rampMs);
        automate(compatible.orientationY, orientation[1], context, rampMs);
        automate(compatible.orientationZ, orientation[2], context, rampMs);
        return;
    }
    compatible.setOrientation(orientation[0], orientation[1], orientation[2]);
};
export const setListenerPositionParams = (listener, position, context, rampMs) => {
    const compatible = listener;
    if (hasThreeParams(compatible.positionX, compatible.positionY, compatible.positionZ)) {
        automate(compatible.positionX, position[0], context, rampMs);
        automate(compatible.positionY, position[1], context, rampMs);
        automate(compatible.positionZ, position[2], context, rampMs);
        return;
    }
    compatible.setPosition(position[0], position[1], position[2]);
};
export const setListenerOrientationParams = (listener, forward, up, context, rampMs) => {
    const compatible = listener;
    const forwardParamsPresent = hasThreeParams(compatible.forwardX, compatible.forwardY, compatible.forwardZ);
    const upParamsPresent = hasThreeParams(compatible.upX, compatible.upY, compatible.upZ);
    if (forwardParamsPresent && upParamsPresent) {
        automate(compatible.forwardX, forward[0], context, rampMs);
        automate(compatible.forwardY, forward[1], context, rampMs);
        automate(compatible.forwardZ, forward[2], context, rampMs);
        automate(compatible.upX, up[0], context, rampMs);
        automate(compatible.upY, up[1], context, rampMs);
        automate(compatible.upZ, up[2], context, rampMs);
        return;
    }
    compatible.setOrientation(forward[0], forward[1], forward[2], up[0], up[1], up[2]);
};
export const createId = (() => {
    let counter = 0;
    return (prefix) => `${prefix}-${Date.now().toString(36)}-${(++counter).toString(36)}`;
})();
//# sourceMappingURL=utils.js.map