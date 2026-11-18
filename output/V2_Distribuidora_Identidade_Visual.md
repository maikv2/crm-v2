# V2 Distribuidora — Identidade Visual e Briefing para Criação de Flyers

> Documento de referência extraído diretamente do site oficial (projeto `v2-storefront`, `v2distribuidora.com`).
> Use este documento junto com o **Prompt de Criação de Flyers** ao conversar com a IA de imagem — cole os dois.

---

## 1. A empresa

- **Nome fantasia:** V2 Distribuidora
- **Razão social:** MP Comércio e Serviços LTDA
- **CNPJ:** 39.531.220/0001-87
- **Sede:** Chapecó-SC
- **Site:** v2distribuidora.com
- **Modelo de negócio:** distribuidora **atacadista B2B** — vende exclusivamente para empresas com CNPJ (lojistas/revendedores), não vende direto ao consumidor final.
- **Posicionamento:** "Distribuição inteligente de acessórios para celular e eletrônicos."

## 2. Segmento (para a IA calibrar o estilo)

**Tecnologia / Acessórios eletrônicos / Distribuição atacadista B2B.**
Isso pede um visual **moderno, técnico e direto** — nada de estética artesanal ou "fofa". Referências: e-commerce tech, painel B2B, catálogo de distribuidora — retas, contraste forte, sensação de eficiência e confiança comercial (fala com lojista, não com consumidor final).

**Linha de produtos:** cabos (V8, USB-C, iOS/Lightning), carregadores/fontes (tomada e veicular), fones de ouvido (com fio P2/USB-C/iOS e bluetooth — linhas "Blue One" e "Blue Pro"), kits carregador, power banks, expositores personalizados para ponto de venda.

## 3. Paleta de cores oficial

| Uso | Cor | Hex |
|---|---|---|
| **Primária** (predominante, cabeçalho, botões, preço) | Azul V2 | `#0026FF` |
| **Secundária** (destaque, selos, badges) | Laranja | `#FF5401` |
| **Accent** (CTAs sobre fundo escuro, "novidade") | Verde neon | `#00FF33` |
| Fundo institucional escuro (faixas full-bleed) | Azul petróleo | `#001240` |
| Fundo claro padrão | Cinza muito claro / branco | `#F8F8F8` / `#FFFFFF` |
| Pastéis de apoio (ícones/selos) | Azul, Verde, Laranja, Vermelho, Roxo pastel | `#B6D7FF` `#B6FFDA` `#FFDBB6` `#FFB6B6` `#E9D4FF` |

**Regra de aplicação:** azul domina a peça (fundo de faixa, header, preço, textos de destaque); laranja aparece em badges/selos e chamadas de urgência; verde neon é usado com moderação, só em CTA/botão de destaque. Nunca usar cores fora dessa paleta como cor principal.

## 4. Tipografia

- **Títulos/Headlines:** **Montserrat**, peso 800–900 (extra bold/black), sem itálico, bem impactante.
- **Corpo de texto:** **Questrial** — sans-serif geométrica, limpa, moderna.
- **Elementos técnicos** (specs, contadores, código, "modo catálogo"): fonte **monoespaçada** (estilo Geist Mono) — dá o toque "tech" em detalhes como códigos de produto ou números.

## 5. Estilo gráfico / linguagem visual

- Cantos **quase retos** (raio pequeno, ~4px) — nada de bordas muito arredondadas; visual industrial/tech, não "fofo".
- Faixas de cor **full-bleed** (azul sólido, laranja sólido) intercalando seções, com bastante contraste.
- Fotos de produto sempre em **fundo neutro/gradiente claro**, produto recortado (sem fundo), foto "flutuando" no card.
- Cards brancos com borda fina cinza clara + leve sombra.
- Ícones dentro de **badges circulares pastel** (ex.: ícone azul dentro de círculo azul-pastel).
- Selos/badges de destaque em laranja sólido com texto branco, cantos retos.
- Gradientes sutis de azul em fundos institucionais (hero, cabeçalho).
- Sensação geral: **confiável, ágil, corporativo-moderno**, nunca artesanal ou "cute".

## 6. Logomarca

Arquivos oficiais (projeto `v2-storefront`):
- `public/logo.png` — versão colorida (uso padrão, fundo claro)
- `public/logo.svg` — versão vetorial colorida
- No rodapé do site, a logo é usada em **branco** sobre fundo azul (`brightness-0 invert`) — ou seja, para peças com fundo escuro/azul/laranja, use a logo em versão branca/monocromática.

## 7. Banco de imagens disponível (para anexar na IA)

Pasta local: `C:\Users\eumai\v2-storefront\public\`

| Tipo | Exemplos de arquivo |
|---|---|
| Fotos reais de operação/estoque | `foto-operacao-01.jpg`, `02`, `03` |
| Fotos reais de instalação em loja | `instalacao-real-01.jpg`, `02`, `03` |
| Produtos com fundo tratado (prontos para flyer) | `produto-cabo-v8.png`, `produto-cabo-tc.png`, `produto-fone-ios.png`, `produto-blue-one.png`, `produto-blue-pro.png`, `produto-kit-tc.png`, etc. |
| Mockups de expositor de loja | `mockup-expositor-ferro.png`, `mockup-expositor-acrilico.png`, `expositor-hero.png`, `expositor-principal.png` |
| Ícones de categoria | `icone-cabos.png`, `icone-fones.png`, `icone-fones-bt.png`, `icone-carregadores.png`, `icone-kits.png` |
| Fotos institucionais | `quem-somos.png` |
| Fotos por SKU (catálogo completo) | `public/produtos/lt0001/1.jpg` ... (uma pasta por código de produto, várias fotos cada) |

Escolha as fotos do produto/promoção que o flyer vai anunciar e envie junto com o prompt.

## 8. Dados para o rodapé (contato)

- **WhatsApp (canal oficial de contato/venda):** +55 49 99800-6597 → link direto: `https://wa.me/5549998006597`
- **Site:** v2distribuidora.com
- **Endereço:** Chapecó-SC *(endereço completo com rua/número não está publicado no site — confirme com a empresa antes de colocar no flyer, ou omita e use só "Chapecó-SC")*
- **E-mail:** *não há e-mail de contato público no site atual* — **confirme o e-mail comercial da V2 antes de gerar o flyer**, ou peça para a IA deixar esse campo como "a definir" seguindo a regra do prompt principal.

## 9. Tom de voz / mensagens-chave já usadas pela empresa

- "Distribuição inteligente de acessórios para celular e eletrônicos."
- Fala direto com o **lojista/revendedor** (nunca com o consumidor final — é venda no atacado, só para empresas com CNPJ).
- Reforça: prazo de entrega, canal exclusivo B2B, atendimento pessoal via WhatsApp, parceria comercial.
- CTA típico: "Falar com WhatsApp" / "Seja Parceiro".

---

## Como usar

1. Abra a pasta `C:\Users\eumai\v2-storefront\public\` e separe as fotos do produto/promoção do flyer.
2. Envie para a IA de criação: **este documento** + **o Prompt de Criação de Flyers** (mensagem anterior) + a logo (`logo.png`) + as fotos escolhidas.
3. Diga na conversa qual é o objetivo do flyer (promoção, lançamento de produto, divulgação para novos lojistas, etc.), o tamanho final desejado, e confirme e-mail/endereço se quiser que apareçam no rodapé.
