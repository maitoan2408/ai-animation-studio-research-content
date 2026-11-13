/** Data-only frame contract, shared by previews and candidate backends.
 * Stage coordinates: 1920x1080, x right, y down; rotation in degrees clockwise.
 * Each sprite's (x,y) is its asset pivot, not its bounding-box centre.
 * Depth is painter order and (for Three/Blender) a shallow physical layer offset.
 */
export type Point = [number, number];
export type ArtAsset = {
  id: string; file: string; width: number; height: number; pivot: Point;
  anchors: Record<string, Point>; category: string; sha256: string;
  colorSpace: 'srgb'; alpha: 'straight'; source: string;
};
export type ArtPack = { version: string; assets: ArtAsset[] };
export type Sprite = {
  id: string; asset: string; x: number; y: number; z: number;
  rotation: number; scaleX: number; scaleY: number; opacity: number;
};
export type Marker = { id: string; point: Point; z: number; kind: 'joint' | 'contact' | 'ground' };
export type SceneFrame = {
  sprites: Sprite[]; markers: Marker[];
  camera: { x: number; y: number; zoom: number };
};
export type ActorPose = {
  id: string; character: 'mai' | 'an'; x: number; floor: number;
  facing: 1 | -1; scale?: number; torsoAngle?: number; headAngle?: number;
  view?: 'front' | 'quarter' | 'profile'; mood?: 'neutral' | 'worried' | 'happy' | 'blink';
  mouth?: 'rest' | 'M' | 'A' | 'E' | 'O' | 'F' | 'smile';
  /** Local coordinates relative to actor origin at floor; targets are wrist/ankle. */
  rightWrist?: Point; leftWrist?: Point; leftAnkle?: Point; rightAnkle?: Point;
  hipOffset?: Point; rightHand?: 'open' | 'grip' | 'point'; leftHand?: 'open' | 'grip' | 'point';
  rightHandAngle?: number; leftHandAngle?: number;
};
export const sprite = (id: string, asset: string, x: number, y: number, z: number,
  rotation = 0, scaleX = 1, scaleY = scaleX): Sprite =>
  ({ id, asset, x, y, z, rotation, scaleX, scaleY, opacity: 1 });
