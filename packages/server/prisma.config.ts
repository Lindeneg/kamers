import createConfig from "./prisma.config.base";

export default createConfig(process.argv.slice(2));
