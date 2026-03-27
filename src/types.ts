export type ProductType = 'v-sign' | 'nameplate' | 'stamp';

export interface ProductOption {
  id: string;
  name: string;
  price: number;
}

export interface CustomizationState {
  type: ProductType;
  text: string;
  size: string;
  material: string;
  color: string;
  quantity: number;
  fixation: string;
}
