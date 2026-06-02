// Point d'entrée isolé pour le chargement à la demande du shader LiquidMetal.
// En ne ré-exportant QUE LiquidMetal, le chunk lazy ne contient que ce shader
// (tree-shaking préservé) au lieu de toute la librairie @paper-design/shaders.
export { LiquidMetal } from '@paper-design/shaders-react';
