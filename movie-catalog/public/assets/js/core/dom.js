export const qs = (sel, parent = document) => parent.querySelector(sel);
export const qsa = (sel, parent = document) => [...parent.querySelectorAll(sel)];
