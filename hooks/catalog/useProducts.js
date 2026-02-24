import { useState, useCallback, useEffect } from 'react';
import { Product } from '@/app/api/entities';

export const useProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const data = await Product.getAll();
            setProducts(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const addProduct = async (productData) => {
        try {
            const newProduct = await Product.create({
                ...productData,
                createdAt: new Date()
            });
            setProducts(prev => [...prev, newProduct]);
            return newProduct;
        } catch (err) {
            console.error('Error adding product:', err);
            throw err;
        }
    };

    const updateProduct = async (id, productData) => {
        try {
            await Product.update(id, {
                ...productData,
                updatedAt: new Date()
            });
            setProducts(prev => prev.map(p => p.id === id ? { ...p, ...productData } : p));
        } catch (err) {
            console.error('Error updating product:', err);
            throw err;
        }
    };

    const deleteProduct = async (id) => {
        try {
            await Product.delete(id);
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error('Error deleting product:', err);
            throw err;
        }
    };

    return {
        products,
        loading,
        error,
        fetchProducts,
        addProduct,
        updateProduct,
        deleteProduct
    };
};
