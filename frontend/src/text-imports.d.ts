/** `import x from './plik.html' with { loader: 'text' }` (loader esbuild w @angular/build). */
declare module '*.html' {
  const content: string;
  export default content;
}
