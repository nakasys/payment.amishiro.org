import { Font } from "@react-pdf/renderer";
import path from "node:path";

const globalFont = globalThis as { __amishiroFont?: boolean };

export function registerJapaneseFont() {
  if (globalFont.__amishiroFont) return;
  Font.register({
    family: "IPAexMincho",
    src: path.join(process.cwd(), "fonts", "IPAexMincho.ttf"),
  });
  Font.registerHyphenationCallback((word) => Array.from(word));
  globalFont.__amishiroFont = true;
}
