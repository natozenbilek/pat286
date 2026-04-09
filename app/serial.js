// ============================================================
// PAT-286 WebSerial Bridge
// PAT monitor V1.1: 9600 baud, 8N2, DTR+RTS required
// Prompt is "PAT: " (not ">")
// Monitor commands: M, C, G, T, L, H+
// C mode exit: ESC (0x1B) + CR (0x0D)
// MUART 8256: init regs 80-88H. D0-D7 LEDs = UPORT2 (92H), not UPORT1 (90H)
// ============================================================

let serialPort = null;
let serialReader = null;
let serialWriter = null;
let serialConnected = false;
let serialRxBuf = '';
let serialRxLog = '';

const SERIAL_BAUD = 9600;
const SERIAL_STOP_BITS = 2;
const PAT_PROMPT = 'PAT:';

// --- Connect / Disconnect ---
async function serialConnect() {
  if (serialConnected) { await serialDisconnect(); return; }
  if (!('serial' in navigator)) {
    sLog('WebSerial requires Chrome or Edge. Not supported in this browser.', 1);
    alert('WebSerial API is not supported in this browser.\n\nPlease use Chrome or Edge.');
    return;
  }
  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({
      baudRate: SERIAL_BAUD,
      dataBits: 8,
      stopBits: SERIAL_STOP_BITS,
      parity: 'none'
    });
    // Briefly deassert DTR/RTS, then gently raise to avoid board reset
    await serialPort.setSignals({ dataTerminalReady: false, requestToSend: false });
    await new Promise(r => setTimeout(r, 100));
    await serialPort.setSignals({ dataTerminalReady: true, requestToSend: true });
    serialWriter = serialPort.writable.getWriter();
    serialConnected = true;
    updateSerialUI();
    sLog('PAT-286 connected (8N2)', 0);
    serialRxLog = 'Connected. Press PAT RESET, wait for "PAT:" prompt, then use buttons.\n';
    updateSerialTerminal();
    startSerialRead();
  } catch (e) {
    if (e.name !== 'NotFoundError') sLog('Serial port error: ' + e.message, 1);
    serialConnected = false;
    updateSerialUI();
  }
}

async function serialDisconnect() {
  serialConnected = false;
  try {
    if (serialReader) {
      try { await serialReader.cancel(); } catch(e) {}
      try { serialReader.releaseLock(); } catch(e) {}
      serialReader = null;
    }
    if (serialWriter) {
      try { await serialWriter.close(); } catch(e) {}
      try { serialWriter.releaseLock(); } catch(e) {}
      serialWriter = null;
    }
    if (serialPort) {
      try { await serialPort.close(); } catch(e) {}
      serialPort = null;
    }
  } catch (e) {}
  updateSerialUI();
  sLog('Disconnected.', 0);
  serialRxLog += '\n--- Disconnected ---\n';
  updateSerialTerminal();
}

// --- Serial read loop ---
async function startSerialRead() {
  if (!serialPort || !serialPort.readable) return;
  try {
    serialReader = serialPort.readable.getReader();
    while (serialConnected) {
      const { value, done } = await serialReader.read();
      if (done) break;
      if (value) {
        let text = '';
        for (let i = 0; i < value.length; i++) {
          let ch = value[i];
          if (ch >= 32 && ch <= 126) text += String.fromCharCode(ch);
          else if (ch === 13) text += '\n';
          else if (ch === 10) {} // skip LF
          else if (ch === 0x0C) text += '[FF]';
          else text += '[' + ch.toString(16).toUpperCase().padStart(2,'0') + ']';
        }
        serialRxBuf += text;
        serialRxLog += text;
        if (serialRxBuf.length > 2000) serialRxBuf = serialRxBuf.slice(-1000);
        if (serialRxLog.length > 8000) serialRxLog = serialRxLog.slice(-6000);
        updateSerialTerminal();
      }
    }
  } catch (e) {
    if (serialConnected) sLog('Serial read error: ' + e.message, 1);
  } finally {
    if (serialReader) { try { serialReader.releaseLock(); } catch(e){} serialReader = null; }
  }
}

// --- Low-level send ---
async function serialSendRaw(text) {
  if (!serialConnected || !serialWriter) return;
  try {
    await serialWriter.write(new TextEncoder().encode(text));
  } catch (e) {
    sLog('Serial write error: ' + e.message, 1);
  }
}

// --- Send raw bytes (Uint8Array) ---
async function serialSendBytes(bytes) {
  if (!serialConnected || !serialWriter) return;
  try {
    await serialWriter.write(new Uint8Array(bytes));
  } catch (e) {
    sLog('Serial write error: ' + e.message, 1);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Slow send: char by char at baud rate ---
async function serialSendSlow(text) {
  if (!serialConnected || !serialWriter) return;
  let enc = new TextEncoder();
  try {
    for (let i = 0; i < text.length; i++) {
      await serialWriter.write(enc.encode(text[i]));
      await sleep(2);
    }
  } catch (e) {
    sLog('Serial write error: ' + e.message, 1);
  }
}

// --- Slow send bytes ---
async function serialSendBytesSlow(bytes) {
  if (!serialConnected || !serialWriter) return;
  try {
    for (let i = 0; i < bytes.length; i++) {
      await serialWriter.write(new Uint8Array([bytes[i]]));
      await sleep(2);
    }
  } catch (e) {
    sLog('Serial write error: ' + e.message, 1);
  }
}

// --- Send and wait for response pattern ---
// Uses FAST raw send (like IDE). For terminal input use serialSendSlow.
async function sendAndWait(cmd, pattern, timeoutMs) {
  let mark = serialRxBuf.length;
  if (cmd) await serialSendRaw(cmd);
  return new Promise(resolve => {
    let start = Date.now();
    let check = () => {
      let newData = serialRxBuf.slice(mark);
      if (newData.includes(pattern)) { resolve(true); return; }
      if (Date.now() - start > timeoutMs) { resolve(false); return; }
      setTimeout(check, 30);
    };
    check();
  });
}

// --- Intel HEX helpers ---
function ihexChecksum(bytes) {
  let sum = 0;
  for (let b of bytes) sum += b;
  return (~sum + 1) & 0xFF;
}

function ihexLine(addr, data) {
  let bytes = [data.length, (addr >> 8) & 0xFF, addr & 0xFF, 0x00, ...data];
  let cs = ihexChecksum(bytes);
  let hex = ':';
  for (let b of bytes) hex += b.toString(16).toUpperCase().padStart(2, '0');
  hex += cs.toString(16).toUpperCase().padStart(2, '0');
  return hex;
}

// ===================================================================
// METHOD 1: Intel HEX upload via L + /t1 (IDE protocol)
// IDE sends commands as FAST whole writes, 10ms between HEX lines.
// We replicate exact same timing.
// ===================================================================
async function uploadHexAndRun(machineCode, label) {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }

  let hexData = ihexLine(0x0100, machineCode);
  let hexEnd = ':00000001FF';

  serialRxLog += '\n=== ' + (label || 'HEX UPLOAD') + ' ===\n';
  updateSerialTerminal();

  // 1. Send Enter to check prompt
  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] No PAT: prompt, continuing...\n';
  updateSerialTerminal();

  // 2. L — send FAST (not slow), wait 700ms like IDE
  serialRxLog += 'TX: L\n';
  updateSerialTerminal();
  await serialSendRaw('L\r\n');
  await sleep(700);

  // 3. /t1 — send FAST, wait 700ms
  serialRxLog += 'TX: /t1\n';
  updateSerialTerminal();
  await serialSendRaw('/t1\r\n');
  await sleep(700);

  // 4. HEX data line — send FAST as one write, 10ms delay
  serialRxLog += 'TX: ' + hexData + '\n';
  updateSerialTerminal();
  await serialSendRaw(hexData + '\r\n');
  await sleep(10);

  // 5. End record — send FAST, 10ms delay
  serialRxLog += 'TX: ' + hexEnd + '\n';
  updateSerialTerminal();
  await serialSendRaw(hexEnd + '\r\n');
  await sleep(1000);

  // 6. G 0100 — send FAST
  serialRxLog += 'TX: G 0100\n';
  updateSerialTerminal();
  let gotG = await sendAndWait('G 0100\r\n', PAT_PROMPT, 5000);
  serialRxLog += gotG ? '=== SUCCESS ===\n' : '--- G TIMEOUT (check LEDs) ---\n';
  updateSerialTerminal();
}

// ===================================================================
// METHOD 2: C command + ESC exit — write bytes, ESC+CR to exit C mode,
// then G 0100 to execute. RAM is preserved (no reset needed).
// ===================================================================
async function uploadCmdAndRun(machineCode, label, startAddr) {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
  let addr = (startAddr || 0x0100);
  let addrStr = addr.toString(16).toUpperCase().padStart(4, '0');
  let fullAddr = '0080:' + addrStr;  // Always use segment 0080

  serialRxLog += '\n=== ' + (label || 'C CMD') + ' (C + ESC exit) ===\n';
  updateSerialTerminal();

  // 1. Check prompt
  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] No PAT: prompt\n';
  updateSerialTerminal();
  if (!gotP) return;

  // 2. Enter C interactive mode at address (with segment to avoid FFFF issue)
  serialRxLog += 'TX: C ' + fullAddr + '\n';
  updateSerialTerminal();
  let gotC = await sendAndWait('C ' + fullAddr + '\r\n', addrStr, 3000);
  if (!gotC) {
    serialRxLog += '[WARN] No response to C command\n';
    updateSerialTerminal();
    return;
  }
  await sleep(200);

  // 3. Send each byte value, wait for next address prompt
  for (let i = 0; i < machineCode.length; i++) {
    let val = machineCode[i].toString(16).toUpperCase().padStart(2, '0');
    serialRxLog += val + ' ';
    updateSerialTerminal();
    let gotNext = await sendAndWait(val + '\r\n', ':', 2000);
    if (!gotNext && i < machineCode.length - 1) {
      serialRxLog += '[!] ';
      updateSerialTerminal();
    }
    await sleep(50);
  }

  serialRxLog += '\n[OK] ' + machineCode.length + ' bytes written.\n';
  updateSerialTerminal();

  // 4. ESC + CR to exit C interactive mode (RAM preserved)
  serialRxLog += '[...] Exiting C mode (ESC+CR)...\n';
  updateSerialTerminal();
  await serialSendBytes([0x1B, 0x0D]);  // ESC + CR

  // 5. Wait for PAT prompt
  let gotExit = await sendAndWait('', PAT_PROMPT, 3000);
  if (!gotExit) {
    // Try Enter to nudge
    gotExit = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  }
  serialRxLog += gotExit ? '[OK] PAT: prompt received\n' : '[WARN] No PAT: prompt received\n';
  updateSerialTerminal();
  if (!gotExit) return;

  // 6. G [seg:addr] — execute (use segment to avoid FFFF issue)
  await sleep(200);
  serialRxLog += 'TX: G ' + fullAddr + '\n';
  updateSerialTerminal();
  let gotG = await sendAndWait('G ' + fullAddr + '\r\n', PAT_PROMPT, 120000);
  serialRxLog += gotG ? '=== SUCCESS ===\n' : '--- G TIMEOUT ---\n';
  updateSerialTerminal();
}

// ===================================================================
// METHOD 3: Direct port write — no program upload, use C to write
// directly to I/O ports via OUT-like machine code at 0100, then G.
// Uses HEX upload (Method 1) which is the official IDE way.
// ===================================================================
async function directLedTest(portVal, label) {
  let mc = makeLedProgram(portVal);
  await uploadCmdAndRunNoWait(mc, label || ('LED ' + portVal.toString(16).toUpperCase()));
}

// ===================================================================
// Test functions — try HEX method first
// ===================================================================

// MUART init: configure command regs + direction, then write LED value
// D0-D7 LEDs are on PORT 2 (92H), not PORT 1 (90H).
// PORT 1 (90H) controls status signals (EN,WR,BSY,RD,DSC,PZO,UTX,URX).
// UMODEREG (86H) must be 03H+ for Port 2 output mode.
// LED programs use JMP $ (infinite loop) to keep port values active.
function makeLedProgram(ledVal) {
  return [
    0xB0, 0xFF,       // MOV AL, FFh
    0xE6, 0x80,       // OUT 80h, AL  (UCRREG1)
    0xE6, 0x82,       // OUT 82h, AL  (UCRREG2)
    0xE6, 0x84,       // OUT 84h, AL  (UCRREG3)
    0xE6, 0x86,       // OUT 86h, AL  (UMODEREG — FFh sets Port 2 output)
    0xE6, 0x88,       // OUT 88h, AL  (UPORT1CTL — all output)
    0xB0, ledVal & 0xFF, // MOV AL, ledVal
    0xE6, 0x92,       // OUT 92h, AL  (UPORT2 — D0-D7 LEDs)
    0xEB, 0xFE,       // JMP $ (infinite loop — LEDs stay on)
  ];
}

// EXIT: INT 28H AH=04H
const MC_EXIT = [0xBB, 0x00, 0x00, 0xB4, 0x04, 0xCD, 0x28];
// LED programs (loop — press RESET on PAT to stop)
const MC_ALLON = makeLedProgram(0xFF);
const MC_OFF = makeLedProgram(0x00);

// C command method (confirmed working: C + ESC exit + G)
async function testExit()   { await uploadCmdAndRun(MC_EXIT, 'EXIT TEST'); }
async function testLedAll() { await uploadCmdAndRunNoWait(MC_ALLON, 'ALL ON'); }
async function testLedOff() { await uploadCmdAndRunNoWait(MC_OFF, 'LED OFF'); }

// Upload + G without waiting for PAT prompt (for infinite-loop programs)
async function uploadCmdAndRunNoWait(machineCode, label) {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
  let addr = 0x0100;
  let addrStr = addr.toString(16).toUpperCase().padStart(4, '0');
  let fullAddr = '0080:' + addrStr;  // Always use segment 0080

  serialRxLog += '\n=== ' + (label || 'C CMD') + ' (C + ESC exit) ===\n';
  updateSerialTerminal();

  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  serialRxLog += gotP ? '[OK] PAT:\n' : '[WARN] No PAT: prompt\n';
  updateSerialTerminal();
  if (!gotP) return;

  serialRxLog += 'TX: C ' + fullAddr + '\n';
  updateSerialTerminal();
  let gotC = await sendAndWait('C ' + fullAddr + '\r\n', addrStr, 3000);
  if (!gotC) {
    serialRxLog += '[WARN] No response to C command\n';
    updateSerialTerminal();
    return;
  }
  await sleep(200);

  for (let i = 0; i < machineCode.length; i++) {
    let val = machineCode[i].toString(16).toUpperCase().padStart(2, '0');
    serialRxLog += val + ' ';
    updateSerialTerminal();
    let gotNext = await sendAndWait(val + '\r\n', ':', 2000);
    if (!gotNext && i < machineCode.length - 1) {
      serialRxLog += '[!] ';
      updateSerialTerminal();
    }
    await sleep(50);
  }

  serialRxLog += '\n[OK] ' + machineCode.length + ' bytes written.\n';
  updateSerialTerminal();

  serialRxLog += '[...] Exiting C mode (ESC+CR)...\n';
  updateSerialTerminal();
  await serialSendBytes([0x1B, 0x0D]);

  let gotExit = await sendAndWait('', PAT_PROMPT, 3000);
  if (!gotExit) {
    gotExit = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  }
  serialRxLog += gotExit ? '[OK] PAT:\n' : '[WARN] No PAT: prompt received\n';
  updateSerialTerminal();
  if (!gotExit) return;

  await sleep(200);
  serialRxLog += 'TX: G ' + fullAddr + '\n';
  updateSerialTerminal();
  await serialSendRaw('G ' + fullAddr + '\r\n');
  // Don't wait for PAT prompt — program runs forever (JMP $)
  serialRxLog += '=== RUNNING (press RESET to stop) ===\n';
  updateSerialTerminal();
}

// ===================================================================
// Upload assembled program from editor to real hardware
// Reads bytes from mem[] (set by doAssemble), sends via C method
// ===================================================================
async function uploadProgram() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }
  if (!pLen) { sLog('Assemble a program first!', 1); return; }

  // Find program byte range from assembled output in mem[]
  let org = progOrg; // stable ORG from last assembly (not mutable IP)
  let startPhys = 0x80 * 16 + org;
  let endPhys = startPhys;
  // Find extent from all assembled items (instructions + data)
  for (let item of asmOutput) {
    let len = item.bytes ? item.bytes.length : (item.words ? item.words.length * 2 : 0);
    let itemEnd = 0x80 * 16 + item.addr + len;
    if (itemEnd > endPhys) endPhys = itemEnd;
  }

  let progBytes = [];
  for (let a = startPhys; a < endPhys; a++) progBytes.push(mem[a]);

  if (!progBytes.length) { sLog('Program is empty!', 1); return; }

  sLog(`Uploading ${progBytes.length} bytes to device...`, 0);
  await uploadCmdAndRun(progBytes, 'UPLOAD: ' + progBytes.length + 'B @ ' + org.toString(16).toUpperCase() + 'H');
}

// --- Run / Trace commands (fast send) ---
async function sendGo() {
  let addr = progOrg ? progOrg.toString(16).toUpperCase().padStart(4, '0') : '0100';
  let fullAddr = '0080:' + addr;
  serialRxLog += '\nTX: G ' + fullAddr + '\n';
  updateSerialTerminal();
  let got = await sendAndWait('G ' + fullAddr + '\r\n', PAT_PROMPT, 8000);
  serialRxLog += got ? '=== SUCCESS ===\n' : '--- G TIMEOUT ---\n';
  updateSerialTerminal();
}
async function sendTrace() {
  serialRxLog += '\nTX: T 0100\n';
  updateSerialTerminal();
  let got = await sendAndWait('T 0100\r\n', PAT_PROMPT, 5000);
  serialRxLog += got ? '[OK] Trace complete\n' : '--- TIMEOUT ---\n';
  updateSerialTerminal();
}

// --- DTR Reset (manual button) ---
async function sendDtrReset() {
  if (!serialConnected || !serialPort) { sLog('Connect to device first!', 1); return; }
  serialRxLog += '\n[...] DTR reset...\n';
  updateSerialTerminal();
  try {
    await serialPort.setSignals({ dataTerminalReady: false });
    await sleep(100);
    await serialPort.setSignals({ dataTerminalReady: true });
    await sleep(100);
    await serialPort.setSignals({ dataTerminalReady: false });
    serialRxLog += '[OK] DTR toggled. Waiting for PAT:...\n';
  } catch (e) {
    serialRxLog += '[WARN] DTR error: ' + e.message + '\n';
  }
  updateSerialTerminal();
}

// --- Send from terminal input (slow) ---
async function serialTermSend() {
  let input = document.getElementById('serialInput');
  if (!input || !input.value.trim()) return;
  let cmd = input.value;
  serialRxLog += '> ' + cmd + '\n';
  updateSerialTerminal();
  await serialSendSlow(cmd + '\r\n');
  input.value = '';
}

// --- UI ---
function updateSerialUI() {
  let btn = document.getElementById('serialBtn');
  let dot = document.getElementById('serialDot');
  let dot2 = document.getElementById('serialDot2');
  if (btn) {
    btn.textContent = serialConnected ? 'Disconnect' : 'Device';
    btn.classList.toggle('connected', serialConnected);
  }
  if (dot) dot.classList.toggle('connected', serialConnected);
  if (dot2) dot2.classList.toggle('connected', serialConnected);
  // Update connect button in Device panel
  let btn2 = document.getElementById('serialBtn2');
  if (btn2) {
    btn2.textContent = serialConnected ? 'Disconnect' : 'Connect';
    btn2.classList.toggle('connected', serialConnected);
  }
  // Toggle upload button active state
  let upBtn = document.getElementById('uploadBtn');
  if (upBtn) upBtn.classList.toggle('active', serialConnected);
}

function updateSerialTerminal() {
  let el = document.getElementById('serialLog');
  if (!el) return;
  el.textContent = serialRxLog;
  el.scrollTop = el.scrollHeight;
}

function copySerialLog() {
  navigator.clipboard.writeText(serialRxLog).then(() => {
    sLog('Log copied', 0);
  }).catch(() => {
    let el = document.getElementById('serialLog');
    if (el) {
      let r = document.createRange(); r.selectNodeContents(el);
      let s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
  });
}

// Disable hardware buttons if WebSerial not supported
if (!('serial' in navigator)) {
  let devBtn = document.getElementById('serialBtn');
  let upBtn = document.getElementById('uploadBtn');
  if (devBtn) { devBtn.disabled = true; devBtn.title = 'WebSerial: Chrome/Edge only'; }
  if (upBtn) { upBtn.disabled = true; upBtn.title = 'WebSerial: Chrome/Edge only'; }
}

// ===================================================================
// Display Probe — discover keyboard display address
// Writes test patterns to potential display locations
// ===================================================================
async function probeDisplay() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }

  serialRxLog += '\n=== DISPLAY PROBE ===\n';
  serialRxLog += 'Testing keyboard display addresses...\n';
  updateSerialTerminal();

  // Test 1: Write FF to KYDBUF area (0000:047D-0484) via code
  // This writes to system segment memory
  serialRxLog += '\n[TEST 1] KYDBUF 0000:047D — all segments ON\n';
  updateSerialTerminal();
  // Version A: Write to KYDBUF then EXIT (let monitor refresh display)
  let mc1 = [
    0x1E,                         // PUSH DS
    0xB8, 0x00, 0x00,             // MOV AX, 0000
    0x8E, 0xD8,                   // MOV DS, AX
    // Write FF (all segments) to 047D-0484
    0xC6, 0x06, 0x7D, 0x04, 0xFF, // MOV BYTE PTR [047DH], FF
    0xC6, 0x06, 0x7E, 0x04, 0xFF, // MOV BYTE PTR [047EH], FF
    0xC6, 0x06, 0x7F, 0x04, 0xFF, // MOV BYTE PTR [047FH], FF
    0xC6, 0x06, 0x80, 0x04, 0xFF, // MOV BYTE PTR [0480H], FF
    0xC6, 0x06, 0x81, 0x04, 0xFF, // MOV BYTE PTR [0481H], FF
    0xC6, 0x06, 0x82, 0x04, 0xFF, // MOV BYTE PTR [0482H], FF
    0xC6, 0x06, 0x83, 0x04, 0xFF, // MOV BYTE PTR [0483H], FF
    0xC6, 0x06, 0x84, 0x04, 0xFF, // MOV BYTE PTR [0484H], FF
    0x1F,                         // POP DS
    // EXIT instead of JMP $ — return to PAT monitor so it can refresh display
    0xB4, 0x04,                   // MOV AH, 04H (EXIT)
    0xCD, 0x28,                   // INT 28H
  ];
  await uploadCmdAndRun(mc1, 'PROBE: KYDBUF 047D + EXIT');
  serialRxLog += '>>> If display shows 8s now, KYDBUF is correct (monitor refreshes it).\n';
  serialRxLog += '>>> If not, press RESET and try Port Scan.\n';
  updateSerialTerminal();
}

async function probeDisplay2() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }

  // Test 2: Try 8279 keyboard/display controller
  // Common 8279 ports: 20H/21H, 40H/41H, or other addresses
  // 8279 init: command=00, write display RAM command=80H
  serialRxLog += '\n[TEST 2] 8279 display controller — port 20H/21H\n';
  updateSerialTerminal();
  let mc2 = [
    // Try 8279 at port 21H (command), 20H (data)
    // Command: clear display (CD=1DH)
    0xB0, 0xD1,       // MOV AL, D1H (clear display, all 1s)
    0xE6, 0x21,       // OUT 21H, AL (command port)
    // Wait a bit
    0xB9, 0xFF, 0x00, // MOV CX, 00FF
    0xE2, 0xFE,       // LOOP $
    // Write display: command 80H = write display RAM addr 0
    0xB0, 0x80,       // MOV AL, 80H (write display RAM, addr 0)
    0xE6, 0x21,       // OUT 21H, AL
    // Write 8 digits of "88888888" (FF = all segments)
    0xB0, 0xFF,       // MOV AL, FFH
    0xE6, 0x20,       // OUT 20H, AL (digit 0)
    0xE6, 0x20,       // OUT 20H, AL (digit 1)
    0xE6, 0x20,       // OUT 20H, AL (digit 2)
    0xE6, 0x20,       // OUT 20H, AL (digit 3)
    0xE6, 0x20,       // OUT 20H, AL (digit 4)
    0xE6, 0x20,       // OUT 20H, AL (digit 5)
    0xE6, 0x20,       // OUT 20H, AL (digit 6)
    0xE6, 0x20,       // OUT 20H, AL (digit 7)
    0xEB, 0xFE        // JMP $
  ];
  await uploadCmdAndRunNoWait(mc2, 'PROBE: 8279 @20H/21H');
  serialRxLog += '>>> Check display! If 8s appear, 8279 is at 20H/21H.\n';
  serialRxLog += '>>> Press PAT RESET, then try next test.\n';
  updateSerialTerminal();
}

async function probeDisplay3() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }

  // Test 3: Try different 8279 port pair: 40H/41H
  serialRxLog += '\n[TEST 3] 8279 @40H/41H\n';
  updateSerialTerminal();
  let mc3 = [
    0xB0, 0xD1,       // MOV AL, D1H (clear display)
    0xE6, 0x41,       // OUT 41H, AL
    0xB9, 0xFF, 0x00, // MOV CX, 00FF
    0xE2, 0xFE,       // LOOP $
    0xB0, 0x80,       // MOV AL, 80H (write RAM addr 0)
    0xE6, 0x41,       // OUT 41H, AL
    0xB0, 0xFF,       // MOV AL, FFH
    0xE6, 0x40,       // OUT 40H, AL
    0xE6, 0x40,
    0xE6, 0x40,
    0xE6, 0x40,
    0xE6, 0x40,
    0xE6, 0x40,
    0xE6, 0x40,
    0xE6, 0x40,
    0xEB, 0xFE
  ];
  await uploadCmdAndRunNoWait(mc3, 'PROBE: 8279 @40H/41H');
  serialRxLog += '>>> Check display! If 8s appear, 8279 is at 40H/41H.\n';
  serialRxLog += '>>> Press PAT RESET, then try next test.\n';
  updateSerialTerminal();
}

async function probeDisplay4() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }

  // Test 4: Try 8279 at 60H/61H
  serialRxLog += '\n[TEST 4] 8279 @60H/61H\n';
  updateSerialTerminal();
  let mc4 = [
    0xB0, 0xD1,
    0xE6, 0x61,
    0xB9, 0xFF, 0x00,
    0xE2, 0xFE,
    0xB0, 0x80,
    0xE6, 0x61,
    0xB0, 0xFF,
    0xE6, 0x60,
    0xE6, 0x60,
    0xE6, 0x60,
    0xE6, 0x60,
    0xE6, 0x60,
    0xE6, 0x60,
    0xE6, 0x60,
    0xE6, 0x60,
    0xEB, 0xFE
  ];
  await uploadCmdAndRunNoWait(mc4, 'PROBE: 8279 @60H/61H');
  serialRxLog += '>>> Check display! If 8s, 8279 is at 60H/61H.\n';
  serialRxLog += '>>> Press PAT RESET to continue.\n';
  updateSerialTerminal();
}

// =================================================================
// PIEZO TEST: Toggle UPORT1 bit 5 to test piezo buzzer
// Quick 1-second beep test
// =================================================================
async function probePiezo() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }

  serialRxLog += '\n=== PIEZO TEST ===\n';
  serialRxLog += 'Toggling ALL bits of UPORT1 (90H) for 1 second...\n';
  updateSerialTerminal();

  // Set UPORT1CTL = FF (all output)
  // Toggle ALL bits of UPORT1 with ~500Hz square wave for 500 cycles
  // Then EXIT
  let mc = [
    0xB0, 0xFF,       // MOV AL, FFH
    0xE6, 0x88,       // OUT 88H, AL (UPORT1CTL = all output)
    0xBA, 0xF4, 0x01, // MOV DX, 500 (cycle count)
    // BEEP loop:
    0xB0, 0xFF,       // MOV AL, FFH (all bits high)
    0xE6, 0x90,       // OUT 90H, AL (UPORT1)
    0xB9, 0x58, 0x02, // MOV CX, 600 (half-period delay)
    0x90,             // NOP
    0xE2, 0xFD,       // LOOP -3
    0xB0, 0x00,       // MOV AL, 00H (all bits low)
    0xE6, 0x90,       // OUT 90H, AL
    0xB9, 0x58, 0x02, // MOV CX, 600
    0x90,             // NOP
    0xE2, 0xFD,       // LOOP -3
    0x4A,             // DEC DX
    0x75, 0xE9,       // JNZ BEEP (-23 -> offset 7)
    // Done
    0xB0, 0x00,       // MOV AL, 00
    0xE6, 0x90,       // OUT 90H, AL
    0xB4, 0x04,       // MOV AH, 04H (EXIT)
    0xCD, 0x28,       // INT 28H
  ];

  await uploadCmdAndRun(mc, 'PIEZO TEST');
  serialRxLog += '>>> Did you hear a beep? If yes, piezo works on UPORT1.\n';
  serialRxLog += '>>> If no sound, piezo may be on a different port/bit.\n';
  updateSerialTerminal();
}

// =================================================================
// PROBE 5: Full I/O Port Scanner
// Reads ALL ports (00-7F, A0-FF), skips MUART 80-9F
// Prints "PP=VV " for ports that don't read FF (= real hardware)
// =================================================================
async function probeScanPorts() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }

  serialRxLog += '\n=== I/O PORT SCANNER ===\n';
  serialRxLog += 'Phase 1: Reading all ports into memory 0200-02FF...\n';
  updateSerialTerminal();

  // SAFE scanner: reads all 256 ports, stores at DS:0200-02FF, then EXITs
  // No INT 28H during scan = no register clobbering risk
  // After EXIT, we use M command to dump results
  //
  // 0100: MOV DI, 0200H      ; destination
  // 0103: XOR DX, DX          ; port 0
  // SCAN:
  // 0105: CMP DL, 80H         ; skip MUART
  // 0108: JB READ
  // 010A: CMP DL, A0H
  // 010D: JB SKIP
  // READ:
  // 010F: IN AL, DX
  // 0110: MOV [DI], AL
  // 0112: JMP NEXT
  // SKIP:
  // 0114: MOV BYTE [DI], FFH  ; mark skipped as FF
  // NEXT:
  // 0118: INC DI
  // 0119: INC DX
  // 011A: CMP DX, 0100H
  // 011E: JB SCAN
  // 0120: EXIT

  let mcScan = [
    0xBF, 0x00, 0x02,             // MOV DI, 0200H
    0x33, 0xD2,                   // XOR DX, DX
    // SCAN (offset 5):
    0x80, 0xFA, 0x80,             // CMP DL, 80H
    0x72, 0x05,                   // JB READ (+5 -> offset 15)
    0x80, 0xFA, 0xA0,             // CMP DL, A0H
    0x72, 0x05,                   // JB SKIP (+5 -> offset 20)
    // READ (offset 15):
    0xEC,                         // IN AL, DX
    0x88, 0x05,                   // MOV [DI], AL
    0xEB, 0x04,                   // JMP NEXT (+4 -> offset 24)
    // SKIP (offset 20):
    0xC6, 0x05, 0xFF,             // MOV BYTE PTR [DI], FFH
    0x90,                         // NOP (alignment)
    // NEXT (offset 24):
    0x47,                         // INC DI
    0x42,                         // INC DX
    0x81, 0xFA, 0x00, 0x01,       // CMP DX, 0100H
    0x72, 0xE5,                   // JB SCAN (-27 -> offset 5)
    // EXIT
    0xB4, 0x04,                   // MOV AH, 04H
    0xCD, 0x28,                   // INT 28H
  ];

  await uploadCmdAndRun(mcScan, 'PORT SCANNER (store)');

  // Phase 2: Dump the results using M command
  serialRxLog += '\nPhase 2: Reading port scan results from memory...\n';
  updateSerialTerminal();

  // Wait for PAT prompt, then send M 0200 to dump results
  await sleep(500);
  let gotP = await sendAndWait('\r\n', PAT_PROMPT, 2000);
  if (!gotP) {
    serialRxLog += '[WARN] No PAT: prompt for M command\n';
    updateSerialTerminal();
    return;
  }

  // Dump 0200-02FF (256 bytes = port scan results)
  serialRxLog += 'TX: M 0200\n';
  updateSerialTerminal();
  let dump1 = await sendAndWait('M 0200\r\n', PAT_PROMPT, 5000);
  if (dump1) {
    serialRxLog += '\n--- PORT SCAN RESULTS (port → value) ---\n';
    // Parse the M command output to show interesting ports
    parsePortScanDump(serialRxBuf || '');
  } else {
    serialRxLog += '[WARN] M command timeout\n';
  }
  updateSerialTerminal();
}

// Parse M dump output and highlight non-FF ports
function parsePortScanDump(raw) {
  serialRxLog += 'Check M dump output above.\n';
  serialRxLog += 'Ports 80-9F = MUART (marked FF). Other non-FF = real hardware.\n';
  serialRxLog += 'Look for values like 00, 10, D0, etc — those are active devices.\n';
}

// =================================================================
// PROBE 6: Brute-force display test — tries ALL even/odd port pairs
// For each pair, sends 8279 init + write FF to all 8 digits
// =================================================================
async function probeBruteDisplay() {
  if (!serialConnected) { sLog('Connect to device first!', 1); return; }

  serialRxLog += '\n=== BRUTE-FORCE DISPLAY PROBE ===\n';
  serialRxLog += 'Will try 8279 init at EVERY port pair 00-7F, A0-FF.\n';
  serialRxLog += 'Watch the keyboard display — if segments light up, we found it!\n\n';
  updateSerialTerminal();

  // Try port pairs: (data, cmd) = (00,01), (02,03), (04,05) ... (7E,7F), (A0,A1) ... (FE,FF)
  // Skip 80-9F (MUART)
  let pairs = [];
  for (let p = 0; p < 0x80; p += 2) pairs.push(p);
  for (let p = 0xA0; p < 0x100; p += 2) pairs.push(p);

  for (let i = 0; i < pairs.length; i++) {
    let dataPort = pairs[i];
    let cmdPort = pairs[i] + 1;

    serialRxLog += `[${i+1}/${pairs.length}] Testing 8279 @${dataPort.toString(16).toUpperCase().padStart(2,'0')}H/${cmdPort.toString(16).toUpperCase().padStart(2,'0')}H... `;
    updateSerialTerminal();

    // Machine code:
    // MOV AL, D1H (clear display, fill with 1s)
    // OUT cmdPort, AL
    // MOV CX, 00FF ; wait
    // LOOP $
    // MOV AL, 80H (write display RAM, addr 0)
    // OUT cmdPort, AL
    // MOV AL, FFH (all segments on)
    // OUT dataPort, AL (x8 digits)
    // ... x8
    // INT 28H AH=16 WTNMS BX=500 (wait 500ms)
    // INT 28H AH=04 EXIT
    let mc = [
      0xB0, 0xD1,                     // MOV AL, D1H
      0xE6, cmdPort & 0xFF,           // OUT cmdPort, AL
      0xB9, 0xFF, 0x00,               // MOV CX, 00FFH
      0xE2, 0xFE,                     // LOOP $
      0xB0, 0x80,                     // MOV AL, 80H
      0xE6, cmdPort & 0xFF,           // OUT cmdPort, AL
      0xB0, 0xFF,                     // MOV AL, FFH
      0xE6, dataPort & 0xFF,          // OUT dataPort x8
      0xE6, dataPort & 0xFF,
      0xE6, dataPort & 0xFF,
      0xE6, dataPort & 0xFF,
      0xE6, dataPort & 0xFF,
      0xE6, dataPort & 0xFF,
      0xE6, dataPort & 0xFF,
      0xE6, dataPort & 0xFF,
      // Wait 500ms so user can see
      0xBB, 0xF4, 0x01,               // MOV BX, 500
      0xB4, 0x10,                     // MOV AH, 10H (WTNMS)
      0xCD, 0x28,                     // INT 28H
      // Clear display (turn off)
      0xB0, 0xD0,                     // MOV AL, D0H (clear with 0s)
      0xE6, cmdPort & 0xFF,           // OUT cmdPort, AL
      0xB9, 0xFF, 0x00,               // MOV CX, 00FFH
      0xE2, 0xFE,                     // LOOP $
      // EXIT
      0xB4, 0x04,                     // MOV AH, 04H
      0xCD, 0x28,                     // INT 28H
    ];

    try {
      await uploadCmdAndRun(mc, `8279@${dataPort.toString(16).toUpperCase()}H`);
      serialRxLog += 'done\n';
    } catch(e) {
      serialRxLog += 'error\n';
    }
    updateSerialTerminal();

    // Small delay between tests
    await sleep(300);
  }

  serialRxLog += '\n>>> Brute-force complete. Did you see any segments light up?\n';
  updateSerialTerminal();
}

// Forwarding stubs
const HW_PORTS = new Set([0x80,0x82,0x84,0x86,0x88,0x8A,0x8C,0x8E,0x90,0x92,0x94,0x96,0x98,0x9A,0x9C,0x9E]);
async function serialWritePort(port, val) {}
function serialReadPort(port) {
  return Promise.resolve(ioPorts ? ioPorts[port & 0xFF] : 0);
}
