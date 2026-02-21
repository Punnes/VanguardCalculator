document.addEventListener('DOMContentLoaded', () => {

    // --- Click to Attack Logic --- //
    const battlefield = document.getElementById('battlefield');
    const sources = document.querySelectorAll('.line-source');
    const targets = document.querySelectorAll('.line-target');
    
    let selectedAttacker = null;

    battlefield.addEventListener('click', (e) => {
        const circle = e.target.closest('.vg-circle');
        
        // Prevent action if clicking on inputs or select inside the circle
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'LABEL') return;

        if (!circle) {
            clearSelection();
            return;
        }

        if (!selectedAttacker) {
            // Trying to select an attacker
            if (circle.classList.contains('line-source') && !circle.classList.contains('rested')) {
                selectedAttacker = circle;
                circle.classList.add('selected-attacker');
                
                // Highlight valid targets visually
                targets.forEach(t => {
                    if (t.getAttribute('data-side') !== selectedAttacker.getAttribute('data-side')) {
                        t.classList.add('valid-target-hint');
                    }
                });
            }
        } else {
            // An attacker is already selected
            if (circle === selectedAttacker) {
                // Clicked same -> deselect
                clearSelection();
            } else if (circle.getAttribute('data-side') === selectedAttacker.getAttribute('data-side')) {
                // Clicked another source on same side -> change selection
                if (circle.classList.contains('line-source') && !circle.classList.contains('rested')) {
                    clearSelection();
                    selectedAttacker = circle;
                    circle.classList.add('selected-attacker');
                    
                    targets.forEach(t => {
                        if (t.getAttribute('data-side') !== selectedAttacker.getAttribute('data-side')) {
                            t.classList.add('valid-target-hint');
                        }
                    });
                }
            } else {
                // Clicked opposite side -> attack if valid target
                if (circle.classList.contains('line-target')) {
                    executeAttack(selectedAttacker, circle);
                    clearSelection();
                }
            }
        }
    });

    function clearSelection() {
        if (selectedAttacker) {
            selectedAttacker.classList.remove('selected-attacker');
        }
        selectedAttacker = null;
        
        targets.forEach(t => {
            t.classList.remove('valid-target-hint');
        });
    }

    // --- Attack Calculation Logic --- //
    function executeAttack(attackerEl, defenderEl) {
        if (attackerEl.classList.contains('rested')) return;

        const atkSide = attackerEl.getAttribute('data-side'); // 'player' or 'opponent'
        const atkCol = attackerEl.getAttribute('data-col'); // 'left', 'center', 'right'
        
        const defSide = defenderEl.getAttribute('data-side');
        
        const atkPrefix = atkSide === 'opponent' ? 'opp' : 'player';

        // --- Attacker Stats ---
        const frontInput = document.getElementById(`${atkPrefix}-front-${atkCol}-power`);
        const backCircle = document.getElementById(`${atkPrefix}-back-${atkCol}`);
        const backInput = document.getElementById(`${atkPrefix}-back-${atkCol}-power`);
        const boostToggle = document.getElementById(`${atkPrefix}-back-${atkCol}-boost`);
        
        let attackerPower = parseInt(frontInput.value) || 0;
        let isBoosting = false;

        if (boostToggle && boostToggle.checked && backCircle && !backCircle.classList.contains('rested')) {
            let backPower = parseInt(backInput.value) || 0;
            attackerPower += backPower;
            isBoosting = true;
        }

        let driveChecks = 0;
        let attackerName = `[${atkSide.toUpperCase()}] Rearguard`;
        
        if (atkCol === 'center') {
            const select = document.getElementById(`${atkPrefix}-drive-select`);
            driveChecks = parseInt(select.value) || 0;
            attackerName = `[${atkSide.toUpperCase()}] Vanguard`;
        }

        // --- Execute Visual Rest ---
        attackerEl.classList.add('rested');

        if (isBoosting) {
            backCircle.classList.add('rested');
        }

        // --- Defender Stats ---
        const defInput = defenderEl.querySelector('.power-input');
        let defenderPower = parseInt(defInput.value) || 0;
        
        // Friendly name
        let targetName = `[${defSide.toUpperCase()}] ` + (defenderEl.classList.contains('vanguard') ? 'Vanguard' : 'Rearguard');

        // --- Calculate Guard ---
        let currentHit = Math.ceil((defenderPower - attackerPower) / 10000);
        let results = [];

        if (currentHit > driveChecks) {
            results.push({ shield: 0, text: 'ป้องกันได้มิด (ไม่ตัองลง Shield)', isMax: true });
        } else {
            let targetTrigger = currentHit < 1 ? 1 : currentHit; 
            
            if (currentHit > 0) {
                results.push({ shield: 0, text: `${currentHit} ใบเข้า`, isMax: false });
                targetTrigger = currentHit + 1;
            }

            for (let S = 5000; S <= 200000; S += 5000) {
                let tHit = Math.ceil((defenderPower + S - attackerPower) / 10000);
                if (tHit >= targetTrigger) {
                    if (tHit > driveChecks) {
                        results.push({ shield: S, text: 'มิด', isMax: true });
                        break;
                    } else {
                        results.push({ shield: S, text: `${tHit} ใบเข้า`, isMax: false });
                        targetTrigger = tHit + 1;
                    }
                }
            }
        }

        renderResults(attackerName, attackerPower, targetName, defenderPower, driveChecks, results, isBoosting);
    }

    function renderResults(atkName, atkPower, defName, defPower, driveChecks, results, isBoosting) {
        const title = document.getElementById('battleTitle');
        const resultsList = document.getElementById('resultsList');
        
        let boostText = isBoosting ? ' + Boost' : '';
        title.innerHTML = `<span style="color:#ff6b6b">${atkName}${boostText} (${atkPower})</span> <br> โจมตีใส่ <span style="color:#4dabf7">${defName} (${defPower})</span>`;
        
        resultsList.innerHTML = '';
        
        if (driveChecks > 0) {
            let headerDiv = document.createElement('div');
            headerDiv.style.marginBottom = '10px';
            headerDiv.style.fontSize = '14px';
            headerDiv.innerHTML = `ไดร์ฟเช็คฝ่ายตี: <strong>${driveChecks}</strong> รอบ`;
            resultsList.appendChild(headerDiv);
        }

        results.forEach(res => {
            const div = document.createElement('div');
            if (res.isMax) {
                div.className = 'result-highlight';
                div.innerHTML = `Protect : ${res.shield} (มิด)`;
            } else {
                div.className = 'result-item';
                div.innerHTML = `Protect : ${res.shield} (${res.text})`;
            }
            resultsList.appendChild(div);
        });

        const box = document.getElementById('resultBox');
        box.classList.remove('slide-up');
        void box.offsetWidth; // Reflow
        box.classList.add('slide-up');
    }

    // --- Reset Actions --- //
    const resetOpponentBtn = document.getElementById('resetOpponentBtn');
    const resetPlayerBtn = document.getElementById('resetPlayerBtn');

    function standSide(side) {
        const circles = document.querySelectorAll(`.vg-circle[data-side="${side}"]`);
        circles.forEach(circle => {
            circle.classList.remove('rested');
        });

        clearSelection();
        document.getElementById('battleTitle').innerHTML = 'เทิร์นใหม่: คลิกที่ยูนิตเพื่อเริ่มโจมตี!';
        document.getElementById('resultsList').innerHTML = '<div class="result-item placeholder">ยังไม่มีการโจมตี (สลับโจมตีได้ทั้ง 2 ฝั่ง)</div>';
    }

    resetOpponentBtn.addEventListener('click', () => standSide('opponent'));
    resetPlayerBtn.addEventListener('click', () => standSide('player'));

});
