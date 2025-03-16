    // logic.js
    // BGM 자동 재생 및 볼륨 조절
    document.addEventListener('click', function startBGM() {
      const bgm = document.getElementById('bgm');
      bgm.volume = 0.3;
      if (bgm.paused) {
        bgm.play().catch(err => console.log("BGM play error: ", err));
      }
      document.removeEventListener('click', startBGM);
    });
    
    const board = document.getElementById("board");
    const turnIndicator = document.getElementById("turn-indicator");
    const poolSize = 6;
    let rows = [];
    let draggedCocktail = null;
    let currentRound = 1;
    const totalRounds = 3;
    
    let deck = [];
    function initGlobalDeck() {
      deck = [];
      deck.push(...Array(7).fill("blue"));
      deck.push(...Array(7).fill("red"));
      deck.push(...Array(7).fill("green"));
      deck.push(...Array(7).fill("yellow"));
      deck.push(...Array(7).fill("pink"));
      deck.push("king");
      deck.sort(() => Math.random() - 0.5);
    }
    
    const players = [
      {
        id: 'human',
        type: 'human',
        deck: [],
        pool: [],
        poolElement: document.getElementById("cocktail-pool-human"),
        container: document.getElementById("player-human"),
        score: 36
      },
      {
        id: 'ai1',
        type: 'ai',
        deck: [],
        pool: [],
        poolElement: document.getElementById("cocktail-pool-ai1"),
        container: document.getElementById("player-ai1"),
        score: 36
      },
      {
        id: 'ai2',
        type: 'ai',
        deck: [],
        pool: [],
        poolElement: document.getElementById("cocktail-pool-ai2"),
        container: document.getElementById("player-ai2"),
        score: 36
      }
    ];
    
    let currentPlayerIndex = 0;
    
    function createBoard() {
      for (let i = 8; i > -1; i--) {
        let row = document.createElement("div");
        row.classList.add("row");
        for (let j = 0; j < 8 - i; j++) {
          let slot = document.createElement("div");
          slot.classList.add("slot");
          slot.dataset.empty = "true";
          slot.dataset.row = i;
          slot.dataset.col = j;
          row.appendChild(slot);
        }
        board.appendChild(row);
        rows[i] = row;
      }
    }
    
    function clearBoard() {
      board.innerHTML = "";
      rows = [];
      createBoard();
    }
    
    function updateScoreBoard() {
      const scoreList = document.getElementById("score-list");
      // 플레이어 배열을 복사한 후, 점수가 높은 순서대로 정렬
      const sortedPlayers = players.slice().sort((a, b) => b.score - a.score);
      let scoreHTML = "";
      sortedPlayers.forEach((player, index) => {
        const name = (player.id.toLowerCase() === "human") ? "YOU" : player.id.toUpperCase();
        // 예: "1.   YOU   : 36"
        scoreHTML += `<li>${(index + 1).toString().padEnd(3, ' ')}. ${name.padEnd(5, ' ')} : ${player.score}</li>`;
      });
      scoreList.innerHTML = scoreHTML;
    }

    
    function addNewCocktailToPlayer(player, cocktailType, isNew = false) {
      let cocktail = document.createElement("img");
      cocktail.src = `./images/${cocktailType}.png`;
      cocktail.classList.add("cocktail");
      cocktail.dataset.type = cocktailType;
      cocktail.draggable = (player.type === "human");
      
      if(isNew) {
        cocktail.style.opacity = "0";
        setTimeout(() => cocktail.style.opacity = "1", 50);
      }
      
      if(player.type === "human") {
        cocktail.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", cocktailType);
          e.target.classList.add("dragging");
          draggedCocktail = cocktail;
          highlightValidSlots(cocktailType);
          cocktail.originalParent = cocktail.parentElement;
          cocktail.originalIndex = Array.from(cocktail.parentElement.children).indexOf(cocktail);
          setTimeout(() => {
            cocktail.style.visibility = "hidden";
          }, 0);
        });
      
        cocktail.addEventListener("dragend", (e) => {
          e.target.classList.remove("dragging");
          clearHighlights();
          if (!draggedCocktail) return;
          e.target.style.visibility = "visible";
        });
      }
      
      player.pool.push(cocktail);
      player.poolElement.appendChild(cocktail);
    }
    
    function refreshCocktailPoolForPlayer(player, gapIndex) {
      const previousPositions = new Map();
      player.pool.forEach(cocktail => {
        if (cocktail.parentElement === player.poolElement) {
          previousPositions.set(cocktail, cocktail.getBoundingClientRect());
        }
      });
      
      player.pool = player.pool.filter(c => c.parentElement === player.poolElement);
      player.poolElement.innerHTML = "";
      player.pool.forEach(cocktail => player.poolElement.appendChild(cocktail));
      while (player.pool.length < poolSize && player.deck.length > 0) {
        addNewCocktailToPlayer(player, player.deck.shift(), true);
      }
      
      player.pool.forEach((cocktail, index) => {
        if (cocktail.parentElement === player.poolElement && index >= gapIndex) {
          const newRect = cocktail.getBoundingClientRect();
          const prevRect = previousPositions.get(cocktail);
          if (prevRect) {
            const deltaX = prevRect.left - newRect.left;
            const deltaY = prevRect.top - newRect.top;
            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
              cocktail.style.transition = 'none';
              cocktail.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
              requestAnimationFrame(() => {
                cocktail.style.transition = 'transform 0.3s ease';
                cocktail.style.transform = '';
              });
              cocktail.addEventListener('transitionend', function handler() {
                cocktail.style.transition = '';
                cocktail.removeEventListener('transitionend', handler);
              });
            }
          }
        }
      });
    }
    
    document.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    
    document.addEventListener("drop", (e) => {
      if (players[currentPlayerIndex].type !== "human") return;
      e.preventDefault();
      clearHighlights();
      let slot = e.target;
      if (!slot.classList.contains("slot")) {
        slot = slot.closest(".slot");
      }
      if (slot && slot.classList.contains("slot") && slot.dataset.empty === "true") {
        let cocktailType = e.dataTransfer.getData("text/plain");
        if (isValidPlacement(slot, cocktailType)) {
          const gapIndex = draggedCocktail.originalIndex;
          if (draggedCocktail && draggedCocktail.originalParent.contains(draggedCocktail)) {
            draggedCocktail.originalParent.removeChild(draggedCocktail);
            let currentPlayer = players[currentPlayerIndex];
            currentPlayer.pool = currentPlayer.pool.filter(c => c !== draggedCocktail);
            const randomNum = Math.floor(Math.random() * 4) + 1;
            const seDrop = new Audio(`./audio/drop${randomNum}.mp3`);
            seDrop.volume = 1.0;
            seDrop.play().catch(err => console.log("Drop sound play error:", err));
          }
          slot.appendChild(draggedCocktail);
          draggedCocktail.draggable = false;
          draggedCocktail.style.visibility = "visible";
          draggedCocktail.classList.add("drop-animation");
          draggedCocktail.addEventListener("animationend", function handler() {
            this.classList.remove("drop-animation");
            this.removeEventListener("animationend", handler);
          });
          slot.dataset.empty = "false";
          slot.classList.add("occupied");
          refreshCocktailPoolForPlayer(players[currentPlayerIndex], gapIndex);
          setTimeout(() => nextTurn(), 300);
          draggedCocktail = null;
          return;
        }
      }
      let seWrong = new Audio('./audio/wrong.mp3');
      seWrong.volume = 1.0;
      seWrong.play().catch(err => console.log("Wrong sound play error:", err));
    });
    
    function highlightValidSlots(cocktailType) {
      const slots = board.querySelectorAll(".slot");
      slots.forEach(slot => {
        if (slot.dataset.empty === "true" && isValidPlacement(slot, cocktailType)) {
          slot.classList.add("highlight");
        } else {
          slot.classList.remove("highlight");
        }
      });
    }
    
    function clearHighlights() {
      const slots = board.querySelectorAll(".slot");
      slots.forEach(slot => slot.classList.remove("highlight"));
    }
    
    function isValidPlacement(slot, cocktailType) {
      let rowNumber = parseInt(slot.dataset.row);
      let col = parseInt(slot.dataset.col);
      if (rowNumber === 0) return true;
      
      let supportRow = rows[rowNumber - 1];
      if (!supportRow) return false;
      
      let leftSlot = supportRow.children[col];
      let rightSlot = supportRow.children[col + 1];
      
      if (!leftSlot || leftSlot.dataset.empty === "true" ||
          !rightSlot || rightSlot.dataset.empty === "true") {
        return false;
      }
      
      let leftType = leftSlot.firstChild ? leftSlot.firstChild.dataset.type : null;
      let rightType = rightSlot.firstChild ? rightSlot.firstChild.dataset.type : null;
      
      if (leftType === "king" || rightType === "king") {
        return false;
      }
      
      if (cocktailType === "king") {
        return true;
      } else {
        return (leftType === cocktailType || rightType === cocktailType);
      }
    }
    
    function startTurn() {
      const currentPlayer = players[currentPlayerIndex];
      players.forEach(p => p.container.classList.remove("active-player"));
      currentPlayer.container.classList.add("active-player");
      const displayName = (currentPlayer.id.toLowerCase() === "human") ? "You" : currentPlayer.id.toUpperCase();
      turnIndicator.textContent = `라운드 ${currentRound} - 현재 턴: ${displayName}`;
      
      if (currentPlayer.type === "ai") {
        setTimeout(() => {
          aiTurn(currentPlayer);
        }, 1000);
        disableDragForHuman();
      } else {
        enableDragForHuman();
      }
    }
    
    function nextTurn() {
      let found = false;
      for (let j = 1; j <= players.length; j++) {
        let i = (currentPlayerIndex + j) % players.length;
        if (canPlayerMakeMove(players[i])) {
          currentPlayerIndex = i;
          found = true;
          break;
        }
      }
      if (!found) {
        endRound();
      } else {
        startTurn();
      }
    }
    
    function aiTurn(player) {
      let moveMade = false;
      let usedCocktailIndex = null;
      for (let i = 0; i < player.pool.length; i++) {
        let cocktail = player.pool[i];
        let cocktailType = cocktail.dataset.type;
        const slots = board.querySelectorAll(".slot");
        for (let slot of slots) {
          if (slot.dataset.empty === "true" && isValidPlacement(slot, cocktailType)) {
            usedCocktailIndex = i;
            player.poolElement.removeChild(cocktail);
            player.pool.splice(i, 1);
            slot.appendChild(cocktail);
            cocktail.draggable = false;
            cocktail.classList.add("drop-animation");
            slot.dataset.empty = "false";
            slot.classList.add("occupied");
            moveMade = true;
            break;
          }
        }
        if (moveMade) break;
      }
      if (moveMade) {
        refreshCocktailPoolForPlayer(player, usedCocktailIndex !== null ? usedCocktailIndex : 0);
      }
      nextTurn();
    }
    
    function canPlayerMakeMove(player) {
      const slots = board.querySelectorAll(".slot");
      for (let cocktail of player.pool) {
        for (let slot of slots) {
          if (slot.dataset.empty === "true" && isValidPlacement(slot, cocktail.dataset.type)) {
            return true;
          }
        }
      }
      return false;
    }
    
    function disableDragForHuman() {
      const humanCocktails = document.querySelectorAll("#cocktail-pool-human .cocktail");
      humanCocktails.forEach(cocktail => {
        cocktail.draggable = false;
      });
    }
    
    function enableDragForHuman() {
      const humanCocktails = document.querySelectorAll("#cocktail-pool-human .cocktail");
      humanCocktails.forEach(cocktail => {
        cocktail.draggable = true;
      });
    }
    
    function startRound() {
      clearBoard();
      initGlobalDeck();
      
      players.forEach(player => {
        player.pool = [];
        player.poolElement.innerHTML = "";
        player.deck = deck.splice(0, 12);
        while (player.pool.length < poolSize && player.deck.length > 0) {
          addNewCocktailToPlayer(player, player.deck.shift(), true);
        }
      });
      
      currentPlayerIndex = 0;
      if (currentRound > 1) {
        let startSoundFile = Math.random() < 0.5 ? 'roundstart1.mp3' : 'roundstart2.mp3';
        let seRoundStart = new Audio(`./audio/${startSoundFile}`);
        seRoundStart.volume = 1.0;
        seRoundStart.play().catch(err => console.log("Round start sound error:", err));
      }
      const displayName = (players[currentPlayerIndex].id.toLowerCase() === "human") ? "You" : players[currentPlayerIndex].id.toUpperCase();
      turnIndicator.textContent = `라운드 ${currentRound} - 현재 턴: ${displayName}`;
      startTurn();
    }
    
    function endRound() {
      let seRoundEnd = new Audio('./audio/roundend.mp3');
      seRoundEnd.volume = 1.0;
      seRoundEnd.play().catch(err => console.log("Round end sound error:", err));
      
      players.forEach(player => {
        player.score -= player.pool.length;
      });
      updateScoreBoard();
      
      players.sort((a, b) => b.score - a.score);
      
      if (currentRound >= totalRounds) {
        setTimeout(() => {
          const winnerName = (players[0].id.toLowerCase() === "human") ? "YOU" : players[0].id.toUpperCase();
          alert("게임 종료! 1등 플레이어: " + winnerName);
        }, 500);
      } else {
        currentRound++;
        setTimeout(() => {
          startRound();
        }, 1500);
      }
    }
    
    function initGame() {
      updateScoreBoard();
      startRound();
    }
    
    initGame();
