
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import parse from 'html-react-parser';

const styles = StyleSheet.create({
    page: {
        paddingTop: 70,
        paddingBottom: 60,
        paddingHorizontal: 30,
        fontSize: 8,
        fontFamily: 'Helvetica',
        lineHeight: 1.3,
    },
    header: {
        position: 'absolute',
        top: 15,
        left: 30,
        right: 30,
        height: 45,
        borderBottomWidth: 1,
        borderBottomColor: '#1f2937',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 4,
    },
    footer: {
        position: 'absolute',
        bottom: 15,
        left: 30,
        right: 30,
        height: 40,
        borderTopWidth: 1,
        borderTopColor: '#d1d5db',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 4,
    },
    logoContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    logo: {
        maxWidth: 40,
        maxHeight: 40,
    },
    headerTitles: {
        flex: 1,
    },
    headerSubtitle: {
        fontSize: 6,
        color: '#9ca3af',
    },
    headerTitle: {
        fontSize: 9,
        color: '#111827',
        fontFamily: 'Helvetica-Bold',
    },
    headerMeta: {
        alignItems: 'flex-end',
    },
    codeBadge: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 3,
        paddingHorizontal: 4,
        paddingVertical: 2,
        marginBottom: 2,
    },
    codeLabel: {
        fontSize: 6,
        textTransform: 'uppercase',
        color: '#9ca3af',
    },
    codeValue: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#1f2937',
    },
    dateText: {
        fontSize: 7,
        color: '#6b7280',
    },
    // Content
    mainTitle: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        color: '#111827',
        marginBottom: 8,
    },
    description: {
        fontSize: 9,
        color: '#4b5563',
        marginBottom: 12,
    },
    section: {
        marginBottom: 6,
        padding: 5,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 3,
    },
    sectionTitle: {
        fontSize: 7,
        textTransform: 'uppercase',
        fontFamily: 'Helvetica-Bold',
        color: '#374151',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        paddingBottom: 2,
        marginBottom: 3,
    },
    p: {
        marginBottom: 2,
        fontSize: 7,
        color: '#374151',
    },
    strong: {
        fontFamily: 'Helvetica-Bold',
    },
    em: {
        fontFamily: 'Helvetica-Oblique',
    },
    textRed: {
        color: '#dc2626',
    },
    textBlue: {
        color: '#2563eb',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    col: {
        width: '48%',
    },
    colGap: {
        width: '4%',
    },
    warningBox: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
        borderWidth: 1,
        borderRadius: 3,
        padding: 5,
        marginBottom: 6,
    },
    warningTitle: {
        color: '#b91c1c',
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    stepsTitle: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        marginBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#111827',
        paddingBottom: 3,
    },
    stepContainer: {
        marginBottom: 8,
        flexDirection: 'row',
    },
    stepNumber: {
        width: 18,
        height: 18,
        backgroundColor: '#111827',
        color: 'white',
        fontSize: 9,
        textAlign: 'center',
        borderRadius: 2,
        marginRight: 8,
        paddingTop: 3,
    },
    stepContent: {
        flex: 1,
    },
    stepImage: {
        marginTop: 4,
        width: 180,
        height: 120,
        objectFit: 'contain',
    },
    mainImageContainer: {
        height: 100,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 3,
    },
    mainImage: {
        maxHeight: 95,
        objectFit: 'contain',
    },
    signatureCol: {
        alignItems: 'center',
        width: '30%',
    },
    signatureLine: {
        width: '90%',
        height: 1,
        backgroundColor: '#374151',
        marginBottom: 3,
    },
    signatureLabel: {
        fontSize: 6,
        textTransform: 'uppercase',
        color: '#6b7280',
    },
});

// Helper function
const domNodeToPdf = (children) => {
    if (!children) return null;
    return children.map((child, i) => {
        if (child.type === 'text') {
            return child.data;
        }
        if (child.type === 'tag') {
            // Ignorar tags de strikethrough - retorna apenas o conteúdo interno
            if (['s', 'del', 'strike'].includes(child.name)) {
                return domNodeToPdf(child.children);
            }
            let s = {};
            if (['strong', 'b'].includes(child.name)) s = styles.strong;
            if (['em', 'i'].includes(child.name)) s = styles.em;
            if (child.attribs?.style?.includes('color: rgb(220, 38, 38)')) s = { ...s, ...styles.textRed };
            if (child.attribs?.style?.includes('color: #dc2626')) s = { ...s, ...styles.textRed };
            if (child.attribs?.style?.includes('color: #2563eb')) s = { ...s, ...styles.textBlue };
            return <Text key={i} style={s}>{domNodeToPdf(child.children)}</Text>;
        }
        return null;
    });
};

const HtmlText = ({ html }) => {
    if (!html) return <Text style={{ fontSize: 9, color: '#9ca3af' }}>---</Text>;

    const reactElements = parse(html, {
        replace: (domNode) => {
            if (domNode.type === 'tag') {
                if (domNode.name === 'p') {
                    return (
                        <View style={styles.p}>
                            <Text>{domNodeToPdf(domNode.children)}</Text>
                        </View>
                    );
                }
                if (domNode.name === 'ul') {
                    return <View>{domNodeToPdf(domNode.children)}</View>;
                }
                if (domNode.name === 'li') {
                    return (
                        <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                            <Text style={{ marginRight: 4, fontSize: 9 }}>•</Text>
                            <Text style={{ fontSize: 9 }}>{domNodeToPdf(domNode.children)}</Text>
                        </View>
                    );
                }
            }
        }
    });

    return <View>{reactElements}</View>;
};

export default function PopDocument({ data }) {
    return (
        <Document>
            <Page size="A4" style={styles.page} wrap>

                {/* HEADER */}
                <View style={styles.header} fixed>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        {data.logoUrl && (
                            <Image src={data.logoUrl} style={{ width: 35, height: 35, marginRight: 8 }} />
                        )}
                        <View>
                            <Text style={{ fontSize: 6, color: '#9ca3af' }}>Manual de Processos</Text>
                            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' }}>POP - Procedimento Operacional Padrão</Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#1f2937' }}>{data.codigo || '---'}</Text>
                        <Text style={{ fontSize: 6, color: '#6b7280' }}>{new Date().toLocaleDateString()}</Text>
                    </View>
                </View>

                {/* TITLE */}
                <Text style={styles.mainTitle}>{data.nome || 'Nova Ferramenta'}</Text>
                {data.descricao && <Text style={styles.description}>{data.descricao.replace(/<[^>]*>/g, '')}</Text>}

                {/* IMAGEM À ESQUERDA + DADOS TÉCNICOS À DIREITA */}
                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                    {/* Imagem à esquerda */}
                    <View style={{ width: '35%', marginRight: 10 }}>
                        {data.imageUrl && (
                            <View style={styles.mainImageContainer}>
                                <Image src={data.imageUrl} style={styles.mainImage} />
                            </View>
                        )}
                    </View>
                    {/* Dados Técnicos à direita */}
                    <View style={{ flex: 1 }}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Dados Técnicos</Text>
                            <HtmlText html={data.especificacoes} />
                        </View>
                    </View>
                </View>

                {/* DEMAIS CARDS EM LISTA VERTICAL */}
                <View style={{ marginBottom: 10 }}>
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>EPIs Necessários</Text>
                        <HtmlText html={data.materiais} />
                    </View>
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>Manutenção</Text>
                        <HtmlText html={data.manutencao} />
                    </View>
                    <View style={styles.warningBox} wrap={false}>
                        <Text style={styles.warningTitle}>Precauções de Segurança</Text>
                        <HtmlText html={data.precaucoes} />
                    </View>
                </View>

                {/* STEPS - Starts on new page */}
                {/* Fixed sub-header for procedure pages (appears below main header on page 3+) */}
                <Text
                    style={{
                        position: 'absolute',
                        top: 85,
                        left: 40,
                        right: 40,
                        fontSize: 11,
                        fontFamily: 'Helvetica-Bold',
                        textTransform: 'uppercase',
                        paddingBottom: 4,
                    }}
                    fixed
                    render={({ pageNumber }) => pageNumber > 2 ? 'Descrição do Procedimento (continuação)' : ''}
                />

                <View style={{ marginTop: 10 }} break>
                    <Text style={styles.stepsTitle}>Descrição do Procedimento</Text>
                    {data.passos?.map((passo, index) => (
                        <View key={index} style={{ marginBottom: 12, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 10 }} wrap={false}>
                            {/* Número do passo */}
                            <Text style={styles.stepNumber}>{index + 1}</Text>

                            {/* Texto à esquerda */}
                            <View style={{ flex: 1, paddingRight: passo.imageUrl ? 10 : 0 }}>
                                <HtmlText html={passo.description} />
                            </View>

                            {/* Imagem à direita */}
                            {passo.imageUrl && (
                                <View style={{ width: 140, alignItems: 'center' }}>
                                    <Image src={passo.imageUrl} style={{ width: 130, height: 90, objectFit: 'contain' }} />
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* FOOTER */}
                <View style={styles.footer} fixed>
                    <View style={styles.signatureCol}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Elaboração</Text>
                    </View>
                    <View style={styles.signatureCol}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Aprovação</Text>
                    </View>
                    <View style={styles.signatureCol}>
                        <Text style={{ fontSize: 8 }}>{new Date().toLocaleDateString()}</Text>
                        <Text style={styles.signatureLabel}>Data</Text>
                    </View>
                </View>

            </Page>
        </Document>
    );
}
