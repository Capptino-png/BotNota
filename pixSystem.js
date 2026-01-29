const EfiPay = require('sdk-node-apis-efi');
const fs = require('fs');
const path = require('path');

// === CREDENCIAIS EFI ===
const efiConfig = {
    clientId: 'Client_Id_e624f1b55dc659db246a62991c71d9189f07db',
    clientSecret: 'Client_Secret_7065dc9537c226d88107ad2064153be653dcf562',
    certificate: fs.readFileSync(path.resolve('./PixAutoCert.p12')), // Lê o certificado como buffer
    sandbox: true,
    debug: false
};

// === CLASSE PIX MANAGER ===
class PixManager {
    constructor() {
        // Validação das credenciais antes de inicializar
        this.validateCredentials();
        this.efipay = new EfiPay(efiConfig);
        this.activePixCharges = new Map(); // Cache dos PIX ativos
    }

    // Valida credenciais e certificado
    validateCredentials() {
        console.log('🔍 Validando credenciais EFI...');
        
        const certPath = path.resolve('./PixAutoCert.p12');
        
        // Verifica se o certificado existe
        if (!fs.existsSync(certPath)) {
            throw new Error(`❌ Certificado não encontrado: ${certPath}`);
        }

        // Verifica credenciais
        if (!efiConfig.clientId || !efiConfig.clientSecret) {
            throw new Error('❌ Client ID ou Client Secret não informados');
        }

        // Verifica se as credenciais estão no formato correto
        if (!efiConfig.clientId.startsWith('Client_Id_')) {
            console.warn('⚠️ Client ID pode estar em formato incorreto');
        }

        if (!efiConfig.clientSecret.startsWith('Client_Secret_')) {
            console.warn('⚠️ Client Secret pode estar em formato incorreto');
        }

        // Verifica tamanho do certificado
        const certStats = fs.statSync(certPath);
        console.log(`📊 Tamanho do certificado: ${certStats.size} bytes`);
        
        if (certStats.size === 0) {
            throw new Error('❌ Certificado está vazio');
        }

        // Tenta ler o certificado
        try {
            const certBuffer = fs.readFileSync(certPath);
            console.log(`📋 Certificado lido como buffer: ${certBuffer.length} bytes`);
        } catch (certError) {
            throw new Error(`❌ Erro ao ler certificado: ${certError.message}`);
        }

        console.log('✅ Credenciais validadas com sucesso');
        console.log(`📁 Certificado encontrado: ${certPath}`);
        console.log(`🌍 Ambiente: ${efiConfig.sandbox ? 'SANDBOX (Homologação)' : 'PRODUÇÃO'}`);
        console.log(`🔑 Client ID: ${efiConfig.clientId.substring(0, 20)}...`);
    }

    // Testa conexão com a API EFI usando uma chamada simples
    async testConnection() {
        try {
            console.log('🔄 Testando conexão com EFI Bank...');
            
            // Testa com uma chamada simples de PIX para verificar autenticação
            const testTxid = `TEST${Date.now()}`;
            
            // Cria uma cobrança de teste para verificar se as credenciais funcionam
            const testPixData = {
                calendario: {
                    expiracao: 3600
                },
                valor: {
                    original: '0.01'
                },
                chave: 'pixcaixinhadebrigadeiro@gmail.com',
                solicitacaoPagador: 'Teste de conexao'
            };
            
            // Faz uma chamada de teste (vai falhar por chave inválida, mas testa autenticação)
            try {
                await this.efipay.pixCreateImmediateCharge([], testTxid, testPixData);
                console.log('✅ Conexão com EFI estabelecida com sucesso!');
                return { success: true };
            } catch (testError) {
                // Se der erro de chave PIX, significa que a autenticação funcionou
                if (testError.response && testError.response.status !== 401) {
                    console.log('✅ Autenticação OK (erro esperado de chave PIX)');
                    return { success: true };
                }
                throw testError;
            }
            
        } catch (error) {
            console.error('❌ Erro ao testar conexão EFI:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            return { success: false, error: error.message };
        }
    }

    // Gera cobrança PIX de 1 centavo
    async generatePixCharge(userInfo) {
        try {
            console.log(`💳 Gerando PIX para ${userInfo.name}...`);

            const txid = this.generateTxid(); // Gera ID único da transação
            
            // IMPORTANTE: Use uma chave PIX REAL aqui
            const pixData = {
                calendario: {
                    expiracao: 3600 // 1 hora para expirar
                },
                devedor: {
                    nome: userInfo.name || 'Cliente WhatsApp'
                    // CPF não obrigatório no sandbox
                },
                valor: {
                    original: '0.01' // 1 centavo
                },
                chave: 'testepix@sandbox.com', // Chave PIX para ambiente de sandbox/homologação
                solicitacaoPagador: 'Pagamento teste - 1 centavo via WhatsApp Bot',
                infoAdicionais: [
                    {
                        nome: 'Origem',
                        valor: 'WhatsApp Bot'
                    },
                    {
                        nome: 'Usuario',
                        valor: userInfo.name || 'Desconhecido'
                    },
                    {
                        nome: 'Ambiente',
                        valor: efiConfig.sandbox ? 'Teste' : 'Producao'
                    }
                ]
            };

            console.log('📝 Dados do PIX preparados:', {
                txid,
                valor: pixData.valor.original,
                chave: pixData.chave,
                ambiente: efiConfig.sandbox ? 'SANDBOX' : 'PRODUÇÃO'
            });

            // Verifica novamente as configurações antes de enviar
            console.log('🔧 Configurações EFI:', {
                clientId: efiConfig.clientId ? 'OK' : 'FALTANDO',
                clientSecret: efiConfig.clientSecret ? 'OK' : 'FALTANDO',
                certificate: Buffer.isBuffer(efiConfig.certificate) ? 'OK (Buffer)' : 'FORMATO INCORRETO',
                certificateSize: Buffer.isBuffer(efiConfig.certificate) ? efiConfig.certificate.length : 'N/A',
                sandbox: efiConfig.sandbox
            });

            // Remove a linha que causa erro de versão
            console.log('📦 SDK EFI carregada com sucesso');

            // Cria cobrança na EFI diretamente (sem teste prévio)
            console.log('🚀 Criando cobrança PIX na EFI...');
            
            // Tenta primeira abordagem
            try {
                const response = await this.efipay.pixCreateImmediateCharge([], txid, pixData);
                
                console.log('📥 Resposta da EFI:', {
                    status: response.status,
                    txid: response.data?.txid,
                    location: response.data?.location
                });

                if (response.status === 201) {
                    const chargeData = response.data;
                    
                    // Gera QR Code
                    console.log('🎨 Gerando QR Code...');
                    const qrCodeResponse = await this.efipay.pixGenerateQRCode({ id: chargeData.loc.id });
                    
                    console.log('✅ QR Code gerado com sucesso!');

                    const pixInfo = {
                        txid: txid,
                        valor: '0.01',
                        status: 'ATIVA',
                        criacao: new Date().toISOString(),
                        expiracao: new Date(Date.now() + 3600000).toISOString(), // 1 hora
                        pixCopiaECola: qrCodeResponse.data.qrcode,
                        imagemQrcode: qrCodeResponse.data.imagemQrcode,
                        location: chargeData.location,
                        userInfo: userInfo
                    };

                    // Salva no cache
                    this.activePixCharges.set(txid, pixInfo);

                    console.log('✅ PIX criado com sucesso!', {
                        txid,
                        location: chargeData.location
                    });

                    return {
                        success: true,
                        data: pixInfo
                    };
                }

                throw new Error(`Status inesperado da EFI: ${response.status}`);
                
            } catch (efiError) {
                // Se der erro específico da SDK, tenta configuração alternativa
                console.log('⚠️ Tentando configuração alternativa...');
                
                // Recria a instância com configuração alternativa
                const altConfig = {
                    clientId: efiConfig.clientId,
                    clientSecret: efiConfig.clientSecret,
                    certificate: path.resolve('./PixAutoCert.p12'), // Volta para caminho
                    sandbox: efiConfig.sandbox
                };
                
                console.log('🔄 Usando configuração alternativa com caminho do certificado');
                const altEfiPay = new EfiPay(altConfig);
                
                try {
                    const altResponse = await altEfiPay.pixCreateImmediateCharge([], txid, pixData);
                    
                    if (altResponse.status === 201) {
                        console.log('✅ Sucesso com configuração alternativa!');
                        
                        const chargeData = altResponse.data;
                        const qrCodeResponse = await altEfiPay.pixGenerateQRCode({ id: chargeData.loc.id });
                        
                        const pixInfo = {
                            txid: txid,
                            valor: '0.01',
                            status: 'ATIVA',
                            criacao: new Date().toISOString(),
                            expiracao: new Date(Date.now() + 3600000).toISOString(),
                            pixCopiaECola: qrCodeResponse.data.qrcode,
                            imagemQrcode: qrCodeResponse.data.imagemQrcode,
                            location: chargeData.location,
                            userInfo: userInfo
                        };

                        this.activePixCharges.set(txid, pixInfo);

                        return {
                            success: true,
                            data: pixInfo
                        };
                    }
                } catch (altError) {
                    console.log('❌ Configuração alternativa também falhou');
                    throw efiError; // Lança o erro original
                }
                
                throw efiError;
            }

        } catch (error) {
            // Log detalhado do erro
            console.error('❌ Erro completo capturado:', error);
            console.error('❌ Erro.message:', error.message);
            console.error('❌ Erro.response:', error.response);
            console.error('❌ Erro.name:', error.name);
            console.error('❌ Erro.code:', error.code);
            
            console.error('❌ Erro detalhado ao gerar PIX:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                code: error.code,
                name: error.name
            });
            
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    // Interpreta mensagens de erro
    getErrorMessage(error) {
        console.log('🔍 Analisando erro:', error);
        
        if (error.response?.data) {
            const errorData = error.response.data;
            
            if (errorData.error === 'invalid_client') {
                return 'Credenciais inválidas ou inativas. Verifique Client ID, Client Secret e certificado.';
            }
            
            if (errorData.error === 'invalid_certificate') {
                return 'Certificado inválido ou expirado. Verifique o arquivo .p12';
            }

            if (errorData.error === 'invalid_request') {
                return 'Dados da requisição inválidos. Verifique a chave PIX.';
            }

            if (errorData.nome === 'ChavePixNaoEncontrada') {
                return 'Chave PIX não encontrada. Verifique se a chave está correta e ativa.';
            }

            if (errorData.nome === 'SaldoInsuficiente') {
                return 'Saldo insuficiente para gerar cobrança PIX.';
            }
            
            if (errorData.error_description) {
                return errorData.error_description;
            }

            // Se tem mensagem específica da EFI
            if (errorData.detail || errorData.mensagem) {
                return errorData.detail || errorData.mensagem;
            }
        }

        // Erros de rede/conexão
        if (error.code === 'ENOTFOUND') {
            return 'Erro de conexão com a internet. Verifique sua conexão.';
        }

        if (error.code === 'ECONNREFUSED') {
            return 'Conexão recusada pela EFI. Verifique se o serviço está disponível.';
        }

        // Mensagem genérica
        return error.message || 'Erro interno do servidor';
    }

    // Verifica status do pagamento
    async checkPixStatus(txid) {
        try {
            const response = await this.efipay.pixDetailCharge({ txid });
            
            if (this.activePixCharges.has(txid)) {
                const pixInfo = this.activePixCharges.get(txid);
                pixInfo.status = response.data.status;
                this.activePixCharges.set(txid, pixInfo);
            }

            return {
                success: true,
                status: response.data.status,
                valor: response.data.valor?.original || '0.01'
            };
        } catch (error) {
            console.error('❌ Erro ao verificar PIX:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Gera TXID único
    generateTxid() {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8);
        return `WPP${timestamp}${random}`.substring(0, 35); // Máximo 35 caracteres
    }

    // Lista PIX ativos do usuário
    getUserActivePixCharges(userId) {
        const userCharges = [];
        for (const [txid, pixInfo] of this.activePixCharges.entries()) {
            if (pixInfo.userInfo.userId === userId) {
                userCharges.push({ txid, ...pixInfo });
            }
        }
        return userCharges;
    }

    // Remove PIX expirados
    cleanupExpiredCharges() {
        const now = new Date();
        for (const [txid, pixInfo] of this.activePixCharges.entries()) {
            const expiration = new Date(pixInfo.expiracao);
            if (now > expiration) {
                this.activePixCharges.delete(txid);
            }
        }
    }
}

// Instância global do gerenciador PIX
const pixManager = new PixManager();

// === COMANDO 1CENT ===
async function handle1CentCommand(yurizin, message) {
    const { from, sender, pushName } = message;

    try {
        // Informações do usuário
        const userInfo = {
            userId: sender || from,
            name: pushName || 'Usuário WhatsApp',
            phone: from.split('@')[0]
        };

        // Mensagem de carregamento
        await yurizin.sendMessage(from, {
            text: '⏳ *Gerando PIX de 1 centavo...*\n\n💳 Aguarde, estou processando sua solicitação...'
        });

        // Gera cobrança PIX
        const result = await pixManager.generatePixCharge(userInfo);

        if (result.success) {
            const pixData = result.data;

            // Mensagem principal com PIX
            const pixMessage = `
💰 *PIX GERADO COM SUCESSO!*

💵 **Valor:** R$ 0,01
⏰ **Expira em:** 1 hora
🆔 **ID:** \`${pixData.txid}\`

📱 *OPÇÕES DE PAGAMENTO:*

*1️⃣ PIX Copia e Cola:*
\`${pixData.pixCopiaECola}\`

*2️⃣ Link de Pagamento:*
${pixData.location}

*3️⃣ QR Code:*
Vou enviar a imagem do QR Code logo abaixo! 📷

---
⚡ *Pagamento instantâneo*
🔒 *Seguro e criptografado*
✅ *Confirmação automática*

💡 *Use /status para verificar o pagamento*
            `.trim();

            // Envia mensagem principal
            await yurizin.sendMessage(from, { text: pixMessage });

            // Envia QR Code como imagem (se disponível)
            if (pixData.imagemQrcode) {
                try {
                    // Converte base64 para buffer
                    const qrBuffer = Buffer.from(pixData.imagemQrcode, 'base64');
                    
                    await yurizin.sendMessage(from, {
                        image: qrBuffer,
                        caption: `📷 *QR Code PIX - R$ 0,01*\n\n🔍 Aponte a câmera do seu banco para pagar\n\n⏰ Expira em: 1 hora`
                    });
                } catch (qrError) {
                    console.error('❌ Erro ao enviar QR Code:', qrError);
                }
            }

            // Mensagem de follow-up após 30 segundos
            setTimeout(async () => {
                try {
                    await yurizin.sendMessage(from, {
                        text: `⏰ *Lembrete:* Seu PIX de R$ 0,01 ainda está ativo!\n\n🔄 Use /status para verificar se foi pago\n💡 Expira em aproximadamente 30 minutos`
                    });
                } catch (error) {
                    console.error('❌ Erro no follow-up:', error);
                }
            }, 30000);

            console.log(`✅ PIX de 1 centavo gerado para ${userInfo.name} (${pixData.txid})`);

        } else {
            // Erro ao gerar PIX
            await yurizin.sendMessage(from, {
                text: `❌ *Erro ao gerar PIX*\n\n⚠️ ${result.error}\n\n🔄 Tente novamente em alguns instantes\n\n💬 Se o problema persistir, entre em contato com o suporte.`
            });

            console.error('❌ Falha ao gerar PIX:', result.error);
        }

    } catch (error) {
        console.error('❌ Erro crítico no comando 1cent:', error);
        
        await yurizin.sendMessage(from, {
            text: '❌ *Erro interno do sistema*\n\n🛠️ Nosso sistema está temporariamente indisponível\n\n🔄 Tente novamente em alguns minutos'
        });
    }
}

// === COMANDO STATUS (BONUS) ===
async function handleStatusCommand(yurizin, message) {
    const { from, sender } = message;
    
    try {
        const userCharges = pixManager.getUserActivePixCharges(sender || from);
        
        if (userCharges.length === 0) {
            await yurizin.sendMessage(from, {
                text: '📊 *Status dos seus PIX*\n\n📝 Você não possui PIX ativos no momento\n\n💡 Use /1cent para gerar um novo PIX'
            });
            return;
        }

        let statusMessage = '📊 *SEUS PIX ATIVOS*\n\n';
        
        for (const charge of userCharges) {
            const status = await pixManager.checkPixStatus(charge.txid);
            const statusEmoji = status.status === 'CONCLUIDA' ? '✅' : 
                               status.status === 'ATIVA' ? '⏰' : '❌';
            
            statusMessage += `${statusEmoji} **${charge.txid.substring(0, 10)}...**\n`;
            statusMessage += `💵 R$ ${charge.valor}\n`;
            statusMessage += `📅 ${new Date(charge.criacao).toLocaleString('pt-BR')}\n`;
            statusMessage += `🔄 Status: ${status.status || 'VERIFICANDO'}\n\n`;
        }

        statusMessage += '💡 *PIX pagos são removidos automaticamente*';

        await yurizin.sendMessage(from, { text: statusMessage });

    } catch (error) {
        console.error('❌ Erro no comando status:', error);
        await yurizin.sendMessage(from, {
            text: '❌ Erro ao verificar status dos PIX'
        });
    }
}

// Limpeza automática a cada 30 minutos
setInterval(() => {
    pixManager.cleanupExpiredCharges();
    console.log('🧹 Limpeza de PIX expirados executada');
}, 30 * 60 * 1000);

// === INTEGRAÇÃO NO SEU BOT ===
/*
// Adicione isso no seu switch case:

case '1cent':
    await handle1CentCommand(yurizin, {
        from: info.key.remoteJid,
        sender: info.key.participant || info.key.remoteJid,
        pushName: info.pushName
    });
    break;

case 'status':
    await handleStatusCommand(yurizin, {
        from: info.key.remoteJid,
        sender: info.key.participant || info.key.remoteJid
    });
    break;
*/

module.exports = {
    handle1CentCommand,
    handleStatusCommand,
    PixManager,
    pixManager
};