export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Wireless Bluetooth Headphones",
    category: "Electronics",
    price: 79.99,
    stock: 45,
    description: "Noise-canceling over-ear headphones with 30h battery life.",
  },
  {
    id: "2",
    name: "Mechanical Keyboard RGB",
    category: "Electronics",
    price: 129.99,
    stock: 23,
    description: "Cherry MX switches, full RGB backlighting, aluminum frame.",
  },
  {
    id: "3",
    name: "Running Shoes Pro",
    category: "Sports",
    price: 149.99,
    stock: 0,
    description: "Lightweight marathon shoes with carbon fiber plate.",
  },
  {
    id: "4",
    name: "Organic Green Tea",
    category: "Food & Beverages",
    price: 12.99,
    stock: 150,
    description: "Premium Japanese matcha, 100g tin. Ceremonial grade.",
  },
  {
    id: "5",
    name: "Yoga Mat Premium",
    category: "Sports",
    price: 49.99,
    stock: 67,
    description: "6mm thick, non-slip surface, eco-friendly materials.",
  },
  {
    id: "6",
    name: '4K Monitor 27"',
    category: "Electronics",
    price: 399.99,
    stock: 12,
    description: "IPS panel, 144Hz refresh rate, USB-C connectivity.",
  },
  {
    id: "7",
    name: "Stainless Steel Water Bottle",
    category: "Home & Kitchen",
    price: 24.99,
    stock: 200,
    description: "750ml, double-wall vacuum insulated, keeps drinks cold 24h.",
  },
  {
    id: "8",
    name: "Leather Wallet",
    category: "Accessories",
    price: 59.99,
    stock: 34,
    description: "Genuine Italian leather, RFID blocking, slim bifold design.",
  },
  {
    id: "9",
    name: "Espresso Machine",
    category: "Home & Kitchen",
    price: 299.99,
    stock: 8,
    description: "15-bar pressure, built-in grinder, milk frother included.",
  },
  {
    id: "10",
    name: "Wireless Mouse Ergonomic",
    category: "Electronics",
    price: 44.99,
    stock: 0,
    description: "Vertical design, reduces wrist strain, 6 buttons.",
  },
  {
    id: "11",
    name: "Camping Tent 4-Person",
    category: "Sports",
    price: 189.99,
    stock: 15,
    description: "Waterproof, easy setup, includes rainfly and footprint.",
  },
  {
    id: "12",
    name: "Protein Powder Chocolate",
    category: "Food & Beverages",
    price: 34.99,
    stock: 88,
    description: "25g protein per serving, whey isolate, no artificial sweeteners.",
  },
];
