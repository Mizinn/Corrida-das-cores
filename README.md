# 🏇 Corrida das Cores

Jogo de festa de corrida de cavalos para jogar com os amigos **no mesmo aparelho** (PC, tablet ou celular). Roda direto no navegador, sem instalar nada: funciona no GitHub Pages.

**Jogar:** https://mizinn.github.io/Corrida-das-cores/

## Como funciona
- **2 a 6 cavalos**, cada um de uma cor. Cada vaga pode ser jogador, CPU (fácil, normal ou difícil) ou ficar vazia.
- **Uma tecla por jogador** (A, L, V, P, Z, M). No celular aparece um botão grande por jogador; vários podem tocar ao mesmo tempo.
- **Chicote:** cada toque dá um arranque e gasta fôlego. Martelar a tecla não ajuda, o chicote só vale num ritmo. Sem fôlego, o cavalo cansa.
- **Obstáculos:** quando aparecer **PULE!**, toque. No ponto certo é salto perfeito (com arranque); sem toque o cavalo pula mal e pode tropeçar.
- **Largada:** tocar antes do "JÁ!" queima a largada.
- **9 pistas** com clima e terreno próprios: Prado Verde, Dunas do Sol, Pântano da Chuva, Pico Nevado, Terra Batida, Hipódromo Noturno, Praia Dourada, Grande Steeplechase e Circuito Neon. Lama, areia funda, água, gelo e turbo mudam a velocidade.
- **Forma do dia:** antes de cada corrida cada cavalo recebe forma e gosto por terreno, e a casa calcula as odds simulando a corrida.

## Modos
- **Apostas:** todos começam com $ 1.000 e apostam em qualquer cavalo pelas odds. O dono do cavalo também ganha prêmio por colocação. Quem terminar com mais moedas vence.
- **Pontos:** sem dinheiro, 10/7/5/3/2/1 pontos por colocação.
- **Interativo** (chicote e saltos) ou **Clássico** (ninguém aperta nada, pura sorte).
- Campeonatos de 3, 5, 8 ou 12 corridas, ou uma **corrida rápida**.

No fim tem pódio, estatísticas e prêmios: Campeão, **O Idiota**, Rei do Salto, Mão Pesada, Aposta de Ouro, Pé-frio e Ansioso. Dá para rever a última corrida em replay, e os recordes de cada pista ficam salvos no navegador.

Extras: sons sintetizados (sem arquivos de áudio), narrador por voz opcional (botão 🎙️), fotochart em câmera lenta quando a chegada é apertada.

## Arquivos
- `index.html` — telas do jogo
- `style.css` — visual
- `game.js` — motor da corrida, desenho em canvas, apostas e campeonato

GitHub Pages: branch `main`, pasta `/ (root)`.
