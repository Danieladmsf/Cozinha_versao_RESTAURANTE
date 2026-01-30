
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import parse from 'html-react-parser';

const styles = StyleSheet.create({
    page: {
        paddingTop: 100,
        paddingBottom: 80,
        paddingHorizontal: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        lineHeight: 1.4,
    },
    header: {
        position: 'absolute',
        top: 20,
        left: 40,
        right: 40,
        height: 60,
        borderBottomWidth: 2,
        borderBottomColor: '#1f2937',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 8,
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 40,
        right: 40,
        height: 50,
        borderTopWidth: 1,
        borderTopColor: '#d1d5db',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 8,
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
        fontSize: 18,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        color: '#111827',
        marginBottom: 4,
    },
    description: {
        fontSize: 10,
        color: '#4b5563',
        marginBottom: 15,
        paddingLeft: 8,
        borderLeftWidth: 2,
        borderLeftColor: '#e5e7eb',
    },
    section: {
        marginBottom: 10,
        padding: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 4,
    },
    sectionTitle: {
        fontSize: 8,
        textTransform: 'uppercase',
        fontFamily: 'Helvetica-Bold',
        color: '#374151',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        paddingBottom: 3,
        marginBottom: 5,
    },
    p: {
        marginBottom: 4,
        fontSize: 9,
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
        borderRadius: 4,
        padding: 8,
    },
    warningTitle: {
        color: '#b91c1c',
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 3,
        textTransform: 'uppercase',
    },
    stepsTitle: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#111827',
        paddingBottom: 4,
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
        height: 150,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 4,
    },
    mainImage: {
        maxHeight: 140,
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
                {data.descricao && <Text style={styles.description}>{data.descricao}</Text>}

                {/* MAIN IMAGE */}
                {data.imageUrl && (
                    <View style={styles.mainImageContainer}>
                        <Image src={data.imageUrl} style={styles.mainImage} />
                    </View>
                )}

                {/* TWO COLUMNS */}
                <View style={styles.row}>
                    <View style={styles.col}>
                        <View style={styles.section} wrap={false}>
                            <Text style={styles.sectionTitle}>Dados Técnicos</Text>
                            <HtmlText html={data.especificacoes} />
                        </View>
                        <View style={styles.section} wrap={false}>
                            <Text style={styles.sectionTitle}>Manutenção</Text>
                            <HtmlText html={data.manutencao} />
                        </View>
                    </View>
                    <View style={styles.colGap} />
                    <View style={styles.col}>
                        <View style={styles.section} wrap={false}>
                            <Text style={styles.sectionTitle}>EPIs Necessários</Text>
                            <HtmlText html={data.materiais} />
                        </View>
                        <View style={styles.warningBox} wrap={false}>
                            <Text style={styles.warningTitle}>Precauções de Segurança</Text>
                            <HtmlText html={data.precaucoes} />
                        </View>
                    </View>
                </View>

                {/* STEPS - Starts on new page */}
                {/* Fixed sub-header for procedure pages (appears below main header on page 2+) */}
                <Text
                    style={{
                        position: 'absolute',
                        top: 85,
                        left: 40,
                        right: 40,
                        fontSize: 11,
                        fontFamily: 'Helvetica-Bold',
                        textTransform: 'uppercase',
                        borderBottomWidth: 1,
                        borderBottomColor: '#111827',
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
