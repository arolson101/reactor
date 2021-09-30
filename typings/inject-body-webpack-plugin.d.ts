declare module "inject-body-webpack-plugin" {
    export type Options2 = {
        content: string;
        position?: string;
    };
    /**
     * @param [options] - Plugin options
     */
    export default class InjectBodyPlugin {
        constructor(options?: Options2);
        apply(compiler: any): void;
    }
}