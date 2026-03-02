export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  order?: number;
}

export interface Category {
  id: string;
  name: string;
  order?: number;
  icon?: string;
}
