document.addEventListener('DOMContentLoaded', () => {

    // --- Canvas Setup --- //
    const canvas = document.getElementById('attackCanvas');
    const ctx = canvas.getContext('2d');
    const battlefield = document.getElementById('battlefield');
    
    function resizeCanvas() {
        canvas.width = battlefield.offsetWidth;
        canvas.height = battlefield.offsetHeight;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Initial size

    // --- Drag to Draw Line Logic --- //
    let isDrawing = false;
    let startCircle = null;
    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;
    let validTargetCircle = null;

    const sources = document.querySelectorAll('.line-source');
    const targets = document.querySelectorAll('.line-target');

    function getCenterCoords(element) {
        const rect = element.getBoundingClientRect();
        const containerRect = battlefield.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - containerRect.left,
            y: rect.top + rect.height / 2 - containerRect.top
        };
    }

    // Handle Start Drawing
    function handleStart(e, circle) {
        if (circle.classList.contains('rested')) return;
        
        // Prevent drawing if clicking on inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        isDrawing = true;
        startCircle = circle;
        validTargetCircle = null;
        
        const coords = getCenterCoords(circle);
        startX = coords.x;
        startY = coords.y;

        // Update current position depending on touch/mouse
        if (e.type === 'touchstart') {
            const touch = e.touches[0];
            const containerRect = battlefield.getBoundingClientRect();
            currentX = touch.clientX - containerRect.left;
            currentY = touch.clientY - containerRect.top;
        } else {
            const containerRect = battlefield.getBoundingClientRect();
            currentX = e.clientX - containerRect.left;
            currentY = e.clientY - containerRect.top;
        }
        
        drawFrame();
    }

    // Calculate distance between point and element center
    function getDistanceToTarget(x, y, targetElement) {
        const coords = getCenterCoords(targetElement);
        const dx = x - coords.x;
        const dy = y - coords.y;
        return Math.sqrt(dx*dx + dy*dy);
    }

    // Handle Move
    function handleMove(e) {
        if (!isDrawing) return;
        e.preventDefault(); // Prevent scrolling on touch

        let clientX, clientY;

        if (e.type === 'touchmove') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const containerRect = battlefield.getBoundingClientRect();
        currentX = clientX - containerRect.left;
        currentY = clientY - containerRect.top;

        // Check for hover over valid targets
        let closestTarget = null;
        let minDistance = 90; // Capture radius

        targets.forEach(t => {
            t.classList.remove('valid-target');
            
            // Only targets on the OPPOSITE side
            if (t.getAttribute('data-side') !== startCircle.getAttribute('data-side')) {
                const dist = getDistanceToTarget(currentX, currentY, t);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestTarget = t;
                }
            }
        });

        validTargetCircle = closestTarget;
        if (validTargetCircle) {
            validTargetCircle.classList.add('valid-target');
            // Magnetize line to center of target
            const targetCoords = getCenterCoords(validTargetCircle);
            currentX = targetCoords.x;
            currentY = targetCoords.y;
        }
    }

    // Handle End Function
    function handleEnd() {
        if (!isDrawing) return;
        isDrawing = false;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height); // clear line

        if (validTargetCircle) {
            validTargetCircle.classList.remove('valid-target');
            executeAttack(startCircle, validTargetCircle);
        }
        
        startCircle = null;
        validTargetCircle = null;
    }

    // Attach Event Listeners to each source (front row)
    sources.forEach(source => {
        // Find the overlay specifically to attach events to
        const overlay = source.querySelector('.node-overlay');
        
        ['mousedown', 'touchstart'].forEach(evt => 
            overlay.addEventListener(evt, (e) => handleStart(e, source), {passive: false})
        );
    });

    // Global move/end listeners
    ['mousemove', 'touchmove'].forEach(evt => 
        window.addEventListener(evt, handleMove, {passive: false})
    );

    ['mouseup', 'touchend'].forEach(evt => 
        window.addEventListener(evt, handleEnd)
    );


    // --- Draw Function (AnimationFrame) --- //
    function drawFrame() {
        if (!isDrawing) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (validTargetCircle) {
            ctx.strokeStyle = '#33ff33'; // Green if locked on
            ctx.shadowColor = '#33ff33';
            ctx.lineWidth = 6;
            ctx.shadowBlur = 15;
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.shadowColor = 'transparent';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 0;
        }

        ctx.stroke();

        requestAnimationFrame(drawFrame);
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

        document.getElementById('battleTitle').innerHTML = 'เทิร์นใหม่: ลากเส้นเพื่อโจมตี!';
        document.getElementById('resultsList').innerHTML = '<div class="result-item placeholder">ยังไม่มีการโจมตี</div>';
    }

    resetOpponentBtn.addEventListener('click', () => standSide('opponent'));
    resetPlayerBtn.addEventListener('click', () => standSide('player'));

});
