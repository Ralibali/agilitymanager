declare module "troika-three-text/src/TextBuilder.js" {
  export function configureTextBuilder(config: {
    defaultFontURL?: string;
    unicodeFontsURL?: string;
    useWorker?: boolean;
  }): void;
}
