// Belt-and-suspenders: ensure side-effect CSS imports (e.g. import "@/styles/index.css")
// always resolve under any TS server state, even before Next's own types load.
declare module "*.css";
