import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar uploads de imagens para o Vercel Blob (via API)
 * e remover lógicas de infraestrutura de dentro dos componentes visuais.
 */
export function useRecipeImageUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    /**
     * Função genérica de upload usando Vercel Blob via API Route
     * @param {File} file Arquivo selecionado no input
     * @param {string} pathPrefix Prefixo para organizar no storage (ex: recipes/{id}/main_photo)
     * @returns {Promise<string>} URL de download da imagem salva
     */
    const uploadToVercelBlob = useCallback(async (file, pathPrefix) => {
        if (!file) throw new Error('Nenhum arquivo fornecido.');

        setIsUploading(true);
        setUploadProgress(10); // Inicia progresso

        try {
            // Sanitiza nome do arquivo
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '');
            const filename = `${pathPrefix}_${Date.now()}_${safeName}`;

            const formData = new FormData();
            formData.append('file', file);

            setUploadProgress(40);

            // Chama a API Route de upload configurada no app
            const response = await fetch(`/api/upload?filename=${filename}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Falha no upload para Vercel Blob');
            }

            setUploadProgress(80);

            const newBlob = await response.json();

            setUploadProgress(100);
            return newBlob.url;

        } catch (error) {
            console.error('Erro no hook useRecipeImageUpload:', error);
            throw error;
        } finally {
            setIsUploading(false);
            setTimeout(() => setUploadProgress(0), 1000); // Reseta após 1s
        }
    }, []);

    return {
        uploadToVercelBlob,
        isUploading,
        uploadProgress
    };
}
