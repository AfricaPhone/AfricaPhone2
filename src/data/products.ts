// src/data/products.ts
import firestore from '@react-native-firebase/firestore';
import { Product } from '../types';

export const fetchProductsFromDB = async (): Promise<Product[]> => {
  try {
    console.log("Fetching products from Firestore...");
    const querySnapshot = await firestore().collection('products').get();

    const products: Product[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.name,
        price: data.price,
        image: data.imageUrl,
        category: data.brand.toLowerCase(),
        rating: data.rating || 4.5,
        description: data.description,
      };
    });

    console.log("Products fetched successfully:", products.length);
    return products;
  } catch (error) {
    console.error("Error fetching products: ", error);
    return []; // Retourne un tableau vide en cas d'erreur
  }
};
