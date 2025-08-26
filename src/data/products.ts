// src/data/products.ts
import { collection, getDocs, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from '../firebase/config'; // Importer l'instance db
import { Product } from '../types';

export const fetchProductsFromDB = async (): Promise<Product[]> => {
  try {
    console.log('Fetching products from Firestore...');
    const productsCollection = collection(db, 'products'); // Utiliser db
    const querySnapshot = await getDocs(productsCollection);

    const products: Product[] = querySnapshot.docs.map((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.name,
        price: data.price,
        image: data.imageUrl,
        category: data.brand.toLowerCase(),
        description: data.description,
        rom: data.rom,
        ram: data.ram,
        ram_base: data.ram_base,
        ram_extension: data.ram_extension,
        specifications: data.specifications || [], // MODIFICATION: Ajout des spécifications
      };
    });

    console.log('Products fetched successfully:', products.length);
    return products;
  } catch (error) {
    console.error('Error fetching products: ', error);
    return []; // Retourne un tableau vide en cas d'erreur
  }
};