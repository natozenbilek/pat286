// ============================================================
// PAT-286 Workbench — ISA Reference & Guide
// Comprehensive, student-friendly documentation
// ============================================================

const GUIDE_HTML = {

// ─── TAB 1: OVERVIEW ────────────────────────────────────────
overview: `<h3>Welcome to PAT-286 Workbench</h3>
<p>PAT-286 Workbench is a browser-based 8086 assembly IDE, simulator, and hardware interface for the <strong>DigiAC2000 PAT-286</strong> educational microprocessor board.</p>

<h4>What can you do?</h4>
<ul>
<li><strong>Write</strong> 8086 assembly programs with syntax highlighting and auto-complete</li>
<li><strong>Assemble</strong> instantly in the browser — no external tools needed</li>
<li><strong>Simulate</strong> step-by-step with full register, memory, flag, and I/O visibility</li>
<li><strong>Upload</strong> to the real DigiAC2000 board over USB serial and run on hardware</li>
<li><strong>Debug</strong> with breakpoints, step-back, execution trace, and memory inspection</li>
</ul>

<h4>Quick Start</h4>
<table><tr><th>Step</th><th>Action</th></tr>
<tr><td>1</td><td>Pick an example from the <strong>Explorer</strong> panel (left) or create a new file</td></tr>
<tr><td>2</td><td>Press <kbd>Ctrl+Enter</kbd> or click <strong>Assemble</strong> to compile</td></tr>
<tr><td>3</td><td>Use <strong>Step</strong> / <strong>Run</strong> to execute in the simulator</td></tr>
<tr><td>4</td><td>Connect your PAT-286 via USB and click <strong>Upload and Run</strong> for hardware execution</td></tr></table>

<h4>Keyboard Shortcuts</h4>
<table><tr><th>Key</th><th>Action</th></tr>
<tr><td><kbd>Ctrl+Enter</kbd></td><td>Assemble &amp; load program</td></tr>
<tr><td><kbd>F1</kbd></td><td>Open / close this guide</td></tr>
<tr><td><kbd>Esc</kbd></td><td>Close any open modal</td></tr>
<tr><td><kbd>Tab</kbd></td><td>Insert tab (in editor)</td></tr></table>

<h4>Debugging Features</h4>
<ul>
<li><strong>Breakpoints:</strong> Click any line number in the editor to toggle a breakpoint (red dot). Run will pause when it hits one.</li>
<li><strong>Step Back/Forward:</strong> Navigate execution history with the ← → buttons. See exactly what each instruction changed.</li>
<li><strong>Execution Trace:</strong> The trace panel (right side) shows every executed instruction with register deltas.</li>
<li><strong>Memory View:</strong> Click IP or SP labels in the register panel to follow code or stack in the memory grid.</li>
</ul>

<h4>Hardware Connection (USB Serial)</h4>
<ol>
<li>Connect the DigiAC2000 board to your PC via USB</li>
<li>Click <strong>Device</strong> in the toolbar — select the serial port</li>
<li>The status dot turns green when connected (9600 baud, 8N2)</li>
<li>Reset the PAT board, then use <strong>Upload and Run</strong> to send your program</li>
<li>Use the terminal panel (bottom) to send monitor commands directly</li>
</ol>

<h4>System Parameters</h4>
<table><tr><th>Parameter</th><th>Value</th></tr>
<tr><td>CPU</td><td>Intel 8086 (real mode)</td></tr>
<tr><td>Memory</td><td>1 MB (20-bit addressing via segment:offset)</td></tr>
<tr><td>User segment</td><td>CS = DS = SS = 0080H</td></tr>
<tr><td>Default ORG</td><td>0100H (program loads at 0080:0100)</td></tr>
<tr><td>Stack pointer</td><td>SP = FFF0H (grows downward)</td></tr>
<tr><td>I/O chip</td><td>Intel 8256 MUART (ports 80H–9EH)</td></tr>
<tr><td>Display chip</td><td>ICM7228 (keyboard display module)</td></tr></table>
<p class="guide-note">Physical address = segment &times; 16 + offset. Example: 0080:0100 &rarr; 0080&times;16 + 0100 = 00900H</p>`,

// ─── TAB 2: REGISTERS ──────────────────────────────────────
registers: `<h3>Registers</h3>

<h4>General Purpose Registers (16-bit, split into 8-bit halves)</h4>
<table><tr><th>16-bit</th><th>High byte</th><th>Low byte</th><th>Typical use</th></tr>
<tr><td><code>AX</code></td><td><code>AH</code></td><td><code>AL</code></td><td>Accumulator — arithmetic, I/O, INT 28H function number (AH)</td></tr>
<tr><td><code>BX</code></td><td><code>BH</code></td><td><code>BL</code></td><td>Base register — memory addressing with [BX], delay value (BX for WTNMS)</td></tr>
<tr><td><code>CX</code></td><td><code>CH</code></td><td><code>CL</code></td><td>Counter — LOOP count, shift amount, REP count, string length</td></tr>
<tr><td><code>DX</code></td><td><code>DH</code></td><td><code>DL</code></td><td>Data — MUL/DIV extends here, I/O port address for IN/OUT</td></tr></table>

<h4>Index &amp; Pointer Registers</h4>
<table><tr><th>Register</th><th>Typical use</th></tr>
<tr><td><code>SI</code></td><td>Source index — points to source data in string ops, general addressing</td></tr>
<tr><td><code>DI</code></td><td>Destination index — points to destination in string ops</td></tr>
<tr><td><code>SP</code></td><td>Stack pointer — top of stack (decremented on PUSH, incremented on POP)</td></tr>
<tr><td><code>BP</code></td><td>Base pointer — used to access stack frames and local variables</td></tr></table>

<h4>Segment Registers</h4>
<table><tr><th>Register</th><th>Default value</th><th>Purpose</th></tr>
<tr><td><code>CS</code></td><td>0080H</td><td>Code segment — where instructions are fetched from</td></tr>
<tr><td><code>DS</code></td><td>0080H</td><td>Data segment — default segment for data access ([SI], [BX], etc.)</td></tr>
<tr><td><code>SS</code></td><td>0080H</td><td>Stack segment — used with SP and BP</td></tr>
<tr><td><code>ES</code></td><td>0000H</td><td>Extra segment — destination for string ops (STOSB, MOVSB)</td></tr></table>
<p class="guide-note"><strong>Segment overrides:</strong> Use <code>ES:[DI]</code>, <code>CS:[BX]</code>, <code>SS:[BP]</code> etc. to access memory through a different segment register. You can also PUSH/POP segment registers: <code>PUSH DS</code>, <code>POP ES</code>.</p>

<h4>FLAGS Register</h4>
<p>The FLAGS register is a 16-bit register where individual bits indicate the result of the last arithmetic/logic operation:</p>
<table><tr><th>Bit</th><th>Flag</th><th>Name</th><th>Set (=1) when...</th></tr>
<tr><td>0</td><td><code>CF</code></td><td>Carry</td><td>Unsigned overflow — carry out of MSB (addition) or borrow (subtraction)</td></tr>
<tr><td>2</td><td><code>PF</code></td><td>Parity</td><td>Low byte of result has an even number of 1-bits</td></tr>
<tr><td>4</td><td><code>AF</code></td><td>Auxiliary</td><td>Carry from bit 3 to bit 4 (used for BCD arithmetic)</td></tr>
<tr><td>6</td><td><code>ZF</code></td><td>Zero</td><td>Result is exactly zero</td></tr>
<tr><td>7</td><td><code>SF</code></td><td>Sign</td><td>Result is negative (MSB = 1 in two's complement)</td></tr>
<tr><td>8</td><td><code>TF</code></td><td>Trap</td><td>Single-step mode enabled (debug)</td></tr>
<tr><td>9</td><td><code>IF</code></td><td>Interrupt</td><td>Hardware interrupts are enabled (STI / CLI)</td></tr>
<tr><td>10</td><td><code>DF</code></td><td>Direction</td><td>String operations go backward (decrement SI/DI). Set by STD, cleared by CLD</td></tr>
<tr><td>11</td><td><code>OF</code></td><td>Overflow</td><td>Signed overflow — result doesn't fit in the signed range</td></tr></table>
<p class="guide-note"><strong>Tip:</strong> <code>CMP A,B</code> sets flags as if computing A&minus;B but throws away the result. Conditional jumps (JZ, JL, JG, etc.) all read these flags.</p>`,

// ─── TAB 3: INSTRUCTION SET ────────────────────────────────
instructions: `<h3>Instruction Set Reference</h3>
<p>All standard 8086 instructions supported by the assembler, grouped by category.</p>

<h4>Data Movement</h4>
<table><tr><th>Instruction</th><th>Description</th><th>Example</th></tr>
<tr><td><code>MOV dst, src</code></td><td>Copy src into dst</td><td><code>MOV AX, 1234H</code></td></tr>
<tr><td><code>XCHG a, b</code></td><td>Swap the values of a and b</td><td><code>XCHG AX, BX</code></td></tr>
<tr><td><code>LEA reg, [mem]</code></td><td>Load effective address (not the value, the address itself)</td><td><code>LEA SI, [BX+10]</code></td></tr>
<tr><td><code>PUSH src</code></td><td>SP &minus;= 2, then store src at [SS:SP]</td><td><code>PUSH AX</code> / <code>PUSH DS</code></td></tr>
<tr><td><code>POP dst</code></td><td>Load [SS:SP] into dst, then SP += 2</td><td><code>POP BX</code> / <code>POP ES</code></td></tr>
<tr><td><code>PUSHA / POPA</code></td><td>Push/pop all 8 general-purpose registers at once</td><td><code>PUSHA</code></td></tr>
<tr><td><code>PUSHF / POPF</code></td><td>Push/pop the FLAGS register</td><td><code>PUSHF</code></td></tr>
<tr><td><code>CBW</code></td><td>Sign-extend AL into AX (byte &rarr; word)</td><td><code>CBW</code></td></tr>
<tr><td><code>CWD</code></td><td>Sign-extend AX into DX:AX (word &rarr; double word)</td><td><code>CWD</code></td></tr>
<tr><td><code>XLAT</code></td><td>AL &larr; [BX + AL] (table lookup)</td><td><code>XLAT</code></td></tr></table>

<h4>Arithmetic</h4>
<table><tr><th>Instruction</th><th>Description</th><th>Flags affected</th></tr>
<tr><td><code>ADD dst, src</code></td><td>dst &larr; dst + src</td><td>CF ZF SF OF PF AF</td></tr>
<tr><td><code>ADC dst, src</code></td><td>dst &larr; dst + src + CF (add with carry)</td><td>CF ZF SF OF PF AF</td></tr>
<tr><td><code>SUB dst, src</code></td><td>dst &larr; dst &minus; src</td><td>CF ZF SF OF PF AF</td></tr>
<tr><td><code>SBB dst, src</code></td><td>dst &larr; dst &minus; src &minus; CF (subtract with borrow)</td><td>CF ZF SF OF PF AF</td></tr>
<tr><td><code>INC dst</code></td><td>dst &larr; dst + 1</td><td>ZF SF OF PF AF (not CF!)</td></tr>
<tr><td><code>DEC dst</code></td><td>dst &larr; dst &minus; 1</td><td>ZF SF OF PF AF (not CF!)</td></tr>
<tr><td><code>NEG dst</code></td><td>dst &larr; &minus;dst (two's complement negate)</td><td>CF ZF SF OF PF AF</td></tr>
<tr><td><code>CMP a, b</code></td><td>Compute a &minus; b, set flags, discard result</td><td>CF ZF SF OF PF AF</td></tr>
<tr><td><code>MUL src</code></td><td>Unsigned: AX = AL &times; src (byte) or DX:AX = AX &times; src (word)</td><td>CF OF</td></tr>
<tr><td><code>IMUL src</code></td><td>Signed multiply (same destinations as MUL)</td><td>CF OF</td></tr>
<tr><td><code>DIV src</code></td><td>Unsigned: AL = AX / src, AH = remainder (byte); AX = DX:AX / src (word)</td><td>undefined</td></tr>
<tr><td><code>IDIV src</code></td><td>Signed divide (same as DIV but signed)</td><td>undefined</td></tr></table>

<h4>Logic &amp; Bit Operations</h4>
<table><tr><th>Instruction</th><th>Description</th><th>Notes</th></tr>
<tr><td><code>AND dst, src</code></td><td>dst &larr; dst AND src</td><td>CF=0, OF=0</td></tr>
<tr><td><code>OR dst, src</code></td><td>dst &larr; dst OR src</td><td>CF=0, OF=0</td></tr>
<tr><td><code>XOR dst, src</code></td><td>dst &larr; dst XOR src</td><td>CF=0, OF=0. <code>XOR AX,AX</code> = fast zero</td></tr>
<tr><td><code>NOT dst</code></td><td>dst &larr; bitwise complement of dst</td><td>No flags affected</td></tr>
<tr><td><code>TEST a, b</code></td><td>Compute a AND b, set flags, discard result</td><td>Like AND but doesn't store</td></tr></table>

<h4>Shift &amp; Rotate</h4>
<table><tr><th>Instruction</th><th>Description</th></tr>
<tr><td><code>SHL dst, n</code> / <code>SAL</code></td><td>Shift left by n bits (0 enters from right). n = 1 or CL</td></tr>
<tr><td><code>SHR dst, n</code></td><td>Logical shift right (0 enters from left)</td></tr>
<tr><td><code>SAR dst, n</code></td><td>Arithmetic shift right (sign bit preserved)</td></tr>
<tr><td><code>ROL dst, n</code></td><td>Rotate left — MSB wraps to LSB</td></tr>
<tr><td><code>ROR dst, n</code></td><td>Rotate right — LSB wraps to MSB</td></tr>
<tr><td><code>RCL dst, n</code></td><td>Rotate left through carry (CF participates)</td></tr>
<tr><td><code>RCR dst, n</code></td><td>Rotate right through carry</td></tr></table>

<h4>Control Flow</h4>
<table><tr><th>Instruction</th><th>Jumps when...</th></tr>
<tr><td><code>JMP label</code></td><td>Always (unconditional)</td></tr>
<tr><td><code>JZ / JE</code></td><td>ZF = 1 (result was zero / operands equal)</td></tr>
<tr><td><code>JNZ / JNE</code></td><td>ZF = 0 (not zero / not equal)</td></tr>
<tr><td><code>JC / JB / JNAE</code></td><td>CF = 1 (unsigned below / carry set)</td></tr>
<tr><td><code>JNC / JAE / JNB</code></td><td>CF = 0 (unsigned above-or-equal / no carry)</td></tr>
<tr><td><code>JA / JNBE</code></td><td>CF=0 and ZF=0 (unsigned above)</td></tr>
<tr><td><code>JBE / JNA</code></td><td>CF=1 or ZF=1 (unsigned below-or-equal)</td></tr>
<tr><td><code>JL / JNGE</code></td><td>SF &ne; OF (signed less than)</td></tr>
<tr><td><code>JGE / JNL</code></td><td>SF = OF (signed greater-or-equal)</td></tr>
<tr><td><code>JLE / JNG</code></td><td>ZF=1 or SF&ne;OF (signed less-or-equal)</td></tr>
<tr><td><code>JG / JNLE</code></td><td>ZF=0 and SF=OF (signed greater)</td></tr>
<tr><td><code>JS / JNS</code></td><td>SF=1 (negative) / SF=0 (positive)</td></tr>
<tr><td><code>JO / JNO</code></td><td>OF=1 (overflow) / OF=0</td></tr>
<tr><td><code>JP / JNP</code></td><td>PF=1 (even parity) / PF=0</td></tr>
<tr><td><code>JCXZ</code></td><td>CX = 0</td></tr>
<tr><td><code>LOOP label</code></td><td>CX &minus;= 1; jump if CX &ne; 0</td></tr>
<tr><td><code>LOOPZ / LOOPE</code></td><td>CX &minus;= 1; jump if CX &ne; 0 AND ZF = 1</td></tr>
<tr><td><code>LOOPNZ / LOOPNE</code></td><td>CX &minus;= 1; jump if CX &ne; 0 AND ZF = 0</td></tr></table>

<h4>Subroutines &amp; Interrupts</h4>
<table><tr><th>Instruction</th><th>Description</th></tr>
<tr><td><code>CALL label</code></td><td>Push IP (return address), jump to label</td></tr>
<tr><td><code>RET</code></td><td>Pop IP, continue after the CALL</td></tr>
<tr><td><code>INT n</code></td><td>Software interrupt: push FLAGS, CS, IP; jump to handler at IVT[n]</td></tr>
<tr><td><code>IRET</code></td><td>Return from interrupt: pop IP, CS, FLAGS</td></tr>
<tr><td><code>HLT</code></td><td>Halt CPU until next interrupt</td></tr></table>

<h4>String Operations</h4>
<p>String instructions operate on [DS:SI] (source) and/or [ES:DI] (destination). Direction flag (DF) controls increment (DF=0) or decrement (DF=1).</p>
<table><tr><th>Instruction</th><th>Description</th></tr>
<tr><td><code>MOVSB / MOVSW</code></td><td>Copy byte/word from [DS:SI] to [ES:DI], adjust both</td></tr>
<tr><td><code>STOSB / STOSW</code></td><td>Store AL/AX to [ES:DI], adjust DI</td></tr>
<tr><td><code>LODSB / LODSW</code></td><td>Load [DS:SI] into AL/AX, adjust SI</td></tr>
<tr><td><code>CMPSB / CMPSW</code></td><td>Compare [DS:SI] with [ES:DI], set flags, adjust both</td></tr>
<tr><td><code>SCASB / SCASW</code></td><td>Compare AL/AX with [ES:DI], set flags, adjust DI</td></tr>
<tr><td><code>REP</code></td><td>Prefix: repeat CX times (use with MOVS, STOS, LODS)</td></tr>
<tr><td><code>REPE / REPZ</code></td><td>Prefix: repeat while ZF=1 and CX&ne;0 (use with CMPS, SCAS)</td></tr>
<tr><td><code>REPNE / REPNZ</code></td><td>Prefix: repeat while ZF=0 and CX&ne;0</td></tr>
<tr><td><code>CLD / STD</code></td><td>Clear / set direction flag (CLD = forward, STD = backward)</td></tr></table>

<h4>I/O Instructions</h4>
<table><tr><th>Instruction</th><th>Description</th><th>Example</th></tr>
<tr><td><code>IN AL, port</code></td><td>Read byte from I/O port into AL</td><td><code>IN AL, 90H</code></td></tr>
<tr><td><code>IN AX, port</code></td><td>Read word from I/O port into AX</td><td><code>IN AX, DX</code></td></tr>
<tr><td><code>OUT port, AL</code></td><td>Write AL to I/O port</td><td><code>OUT 90H, AL</code></td></tr>
<tr><td><code>OUT port, AX</code></td><td>Write AX to I/O port</td><td><code>OUT DX, AX</code></td></tr></table>
<p class="guide-note"><strong>Note:</strong> Immediate port values are 0&ndash;FFH. For ports above FFH, put port number in DX and use <code>IN AL, DX</code> / <code>OUT DX, AL</code>.</p>

<h4>BCD &amp; ASCII Adjust</h4>
<table><tr><th>Instruction</th><th>Description</th></tr>
<tr><td><code>DAA / DAS</code></td><td>Decimal adjust AL after packed BCD add / subtract</td></tr>
<tr><td><code>AAA / AAS</code></td><td>ASCII adjust AL after unpacked BCD add / subtract</td></tr>
<tr><td><code>AAM / AAD</code></td><td>ASCII adjust after multiply / before divide</td></tr></table>

<h4>Flag Control</h4>
<table><tr><th>Instruction</th><th>Description</th></tr>
<tr><td><code>CLC / STC / CMC</code></td><td>Clear / set / complement carry flag</td></tr>
<tr><td><code>CLI / STI</code></td><td>Clear / set interrupt flag (disable/enable interrupts)</td></tr>
<tr><td><code>CLD / STD</code></td><td>Clear / set direction flag</td></tr>
<tr><td><code>LAHF / SAHF</code></td><td>Load/store AH from/to low byte of FLAGS</td></tr>
<tr><td><code>NOP</code></td><td>No operation (does nothing, 1 byte)</td></tr></table>`,

// ─── TAB 4: ASSEMBLER SYNTAX ───────────────────────────────
syntax: `<h3>Assembler Syntax &amp; Directives</h3>

<h4>Program Structure</h4>
<pre class="guide-code">        INCLUDE PATCALLS.INC    ; load port/function constants
        ORG     0100H           ; program starts at offset 0100H

START:  MOV     AL, 42H         ; your code here
        ; ...
        MOV     AH, EXIT        ; EXIT = 4
        INT     28H             ; return to PAT monitor

        END                     ; end of source</pre>

<h4>Directives</h4>
<table><tr><th>Directive</th><th>Purpose</th><th>Example</th></tr>
<tr><td><code>ORG addr</code></td><td>Set the starting address for subsequent code/data</td><td><code>ORG 0300H</code></td></tr>
<tr><td><code>DB val, ...</code></td><td>Define byte(s) — numbers, strings, or expressions</td><td><code>DB 0AH, 0BH, 0CH</code> or <code>DB 'Hello', 0</code></td></tr>
<tr><td><code>DW val, ...</code></td><td>Define word(s) — 16-bit values (low byte first)</td><td><code>DW 1234H, 5678H</code></td></tr>
<tr><td><code>EQU expr</code></td><td>Define a named constant (no memory allocated)</td><td><code>COUNT EQU 10</code></td></tr>
<tr><td><code>INCLUDE file</code></td><td>Include definitions (only PATCALLS.INC supported)</td><td><code>INCLUDE PATCALLS.INC</code></td></tr>
<tr><td><code>END</code></td><td>Mark end of source file</td><td><code>END</code></td></tr></table>

<h4>Labels</h4>
<p>Labels mark addresses in your code. They can appear with or without a colon:</p>
<pre class="guide-code">LOOP1:  DEC CX          ; label with colon
        JNZ LOOP1        ; reference the label
MSG     DB 'Hi', 0       ; label without colon (for data)</pre>
<p class="guide-note">Labels are case-insensitive. <code>LOOP1</code>, <code>loop1</code>, and <code>Loop1</code> all refer to the same address.</p>

<h4>Number Formats</h4>
<table><tr><th>Format</th><th>Example</th><th>Meaning</th></tr>
<tr><td>Hexadecimal</td><td><code>0FFH</code> or <code>0x0FF</code></td><td>255 decimal. Hex numbers starting with A-F need a leading 0</td></tr>
<tr><td>Decimal</td><td><code>255</code></td><td>Plain decimal number</td></tr>
<tr><td>Binary</td><td><code>11111111B</code></td><td>Binary with B suffix</td></tr>
<tr><td>Character</td><td><code>'A'</code></td><td>ASCII code of character (65)</td></tr></table>

<h4>Memory Operands</h4>
<table><tr><th>Syntax</th><th>Meaning</th></tr>
<tr><td><code>[BX]</code></td><td>Byte/word at DS:BX</td></tr>
<tr><td><code>[SI+5]</code></td><td>Byte/word at DS:SI+5</td></tr>
<tr><td><code>[BX+SI]</code></td><td>Byte/word at DS:BX+SI</td></tr>
<tr><td><code>[BP+4]</code></td><td>Byte/word at SS:BP+4 (BP defaults to SS)</td></tr>
<tr><td><code>BYTE PTR [SI]</code></td><td>Explicit byte access</td></tr>
<tr><td><code>WORD PTR [SI]</code></td><td>Explicit word access</td></tr>
<tr><td><code>BYTE PTR DS:1000H</code></td><td>Absolute address in DS segment</td></tr>
<tr><td><code>ES:[DI]</code></td><td>Segment override — use ES instead of DS</td></tr></table>
<p class="guide-note"><strong>When to use PTR:</strong> If both operands are registers, the assembler knows the size. If one operand is memory and the other is an immediate, you must use <code>BYTE PTR</code> or <code>WORD PTR</code> to tell the assembler the size. Example: <code>MOV BYTE PTR [SI], 5</code></p>

<h4>OFFSET Operator</h4>
<pre class="guide-code">MSG     DB 'Hello', 0
        MOV SI, OFFSET MSG    ; SI = address of MSG (not the value at MSG)</pre>

<h4>Expression Arithmetic</h4>
<p>The assembler supports basic arithmetic in expressions:</p>
<pre class="guide-code">BUFSIZE EQU 256
        MOV CX, BUFSIZE-1      ; CX = 255
        MOV SI, TABLE+4         ; SI = address of TABLE + 4</pre>

<h4>PATCALLS.INC Constants</h4>
<p>When you add <code>INCLUDE PATCALLS.INC</code> at the top, these named constants become available:</p>
<table><tr><th>Category</th><th>Constants</th></tr>
<tr><td>Segments</td><td><code>USRSEG=0080H</code>, <code>USRBSE=0100H</code>, <code>SYSSEG=0</code>, <code>USER=40H</code></td></tr>
<tr><td>I/O Ports</td><td><code>UCRREG1=80H</code>, <code>UCRREG2=82H</code>, <code>UCRREG3=84H</code>, <code>UMODEREG=86H</code>, <code>UPORT1CTL=88H</code>, <code>UIRQEN=8AH</code>, <code>UIRQADR=8CH</code>, <code>URCVBUF=8EH</code>, <code>UPORT1=90H</code>, <code>UPORT2=92H</code></td></tr>
<tr><td>Timers</td><td><code>UTIMER1=94H</code> through <code>UTIMER5=9CH</code>, <code>USTATUS=9EH</code></td></tr>
<tr><td>PIC</td><td><code>PIC0=40H</code>, <code>PIC1=42H</code></td></tr>
<tr><td>Display</td><td><code>KYDBUF=047DH</code>, <code>DT1=0</code>, <code>DT2=1</code>, <code>DP=2</code>, <code>DKD=3</code>, <code>DCAS=4</code></td></tr>
<tr><td>INT 28H</td><td><code>EXIT=4</code>, <code>RDCHAR=10</code>, <code>RDBYTE=11</code>, <code>WRCHAR=12</code>, <code>WRBYTE=13</code>, <code>GETIN=14</code>, <code>WT1MS=15</code>, <code>WTNMS=16</code>, <code>CRLF=17</code>, <code>CLRSCR=18</code>, <code>LEDON=19</code>, <code>LEDOFF=20</code>, <code>TONE=21</code>, <code>NOTOFF=22</code></td></tr></table>`,

// ─── TAB 5: I/O & HARDWARE ─────────────────────────────────
io_ports: `<h3>I/O Ports &amp; Hardware</h3>

<h4>Intel 8256 MUART — Overview</h4>
<p>The MUART (Multi-function Universal Asynchronous Receiver-Transmitter) provides two 8-bit I/O ports, five timers, a UART, and interrupt control — all through I/O port addresses 80H–9EH.</p>

<h4>MUART Register Map</h4>
<table><tr><th>Port</th><th>Name</th><th>R/W</th><th>Function</th></tr>
<tr><td><code>80H</code></td><td>UCRREG1</td><td>W</td><td>Command register 1 — clock source, baud rate</td></tr>
<tr><td><code>82H</code></td><td>UCRREG2</td><td>W</td><td>Command register 2 — serial format</td></tr>
<tr><td><code>84H</code></td><td>UCRREG3</td><td>W</td><td>Command register 3 — mode control</td></tr>
<tr><td><code>86H</code></td><td>UMODEREG</td><td>W</td><td>Port 2 direction: 03H = output, 00H = input</td></tr>
<tr><td><code>88H</code></td><td>UPORT1CTL</td><td>W</td><td>Port 1 bit-level direction (1 = output, 0 = input)</td></tr>
<tr><td><code>8AH</code></td><td>UIRQEN</td><td>W</td><td>Interrupt enable register (bit 0 = Timer 1)</td></tr>
<tr><td><code>8CH</code></td><td>UIRQADR</td><td>R</td><td>Interrupt address — reading clears the IRQ flag</td></tr>
<tr><td><code>8EH</code></td><td>URCVBUF</td><td>R</td><td>UART receive buffer</td></tr>
<tr><td><code>90H</code></td><td>UPORT1</td><td>R/W</td><td>Port 1 data (8-bit general purpose I/O)</td></tr>
<tr><td><code>92H</code></td><td>UPORT2</td><td>R/W</td><td>Port 2 data (connected to DAC/ADC)</td></tr>
<tr><td><code>94H</code></td><td>UTIMER1</td><td>R/W</td><td>Timer 1 value</td></tr>
<tr><td><code>96H</code></td><td>UTIMER2</td><td>R/W</td><td>Timer 2 value</td></tr>
<tr><td><code>98H</code></td><td>UTIMER3</td><td>R/W</td><td>Timer 3 value</td></tr>
<tr><td><code>9AH</code></td><td>UTIMER4</td><td>R/W</td><td>Timer 4 value</td></tr>
<tr><td><code>9CH</code></td><td>UTIMER5</td><td>R/W</td><td>Timer 5 value</td></tr>
<tr><td><code>9EH</code></td><td>USTATUS</td><td>R</td><td>Status register</td></tr></table>

<h4>Port 1 (UPORT1, 90H) — Bit Assignments</h4>
<table><tr><th>Bit</th><th>Signal</th><th>Dir</th><th>Function</th></tr>
<tr><td>0 (PB0)</td><td>EN</td><td>Out</td><td>DAC enable (active low — set 0 to enable DAC output)</td></tr>
<tr><td>1 (PB1)</td><td>WR</td><td>Out</td><td>ADC start conversion (falling edge triggers conversion)</td></tr>
<tr><td>2 (PB2)</td><td>BSY</td><td>In</td><td>ADC busy flag (0 = conversion in progress)</td></tr>
<tr><td>3 (PB3)</td><td>RD</td><td>Out</td><td>ADC read enable (active low — set 0 to read result)</td></tr>
<tr><td>4 (PB4)</td><td>DSC</td><td>In</td><td>Disk encoder pulse (from motor speed sensor)</td></tr>
<tr><td>5 (PB5)</td><td>PZO</td><td>Out</td><td>Piezo buzzer</td></tr>
<tr><td>6 (PB6)</td><td>UTX</td><td>Out</td><td>Ultrasonic transmitter on/off</td></tr>
<tr><td>7 (PB7)</td><td>URX</td><td>In</td><td>Ultrasonic receiver (echo detection)</td></tr></table>

<h4>Initializing Port 1</h4>
<pre class="guide-code">; Set Port 1 direction: bits 0,1,3,5,6 = output, rest = input
        MOV AL, 01101011B       ; = 6BH
        OUT UPORT1CTL, AL       ; write to port 1 control (88H)</pre>
<p class="guide-note"><strong>Tip:</strong> For the piezo buzzer, toggling ALL bits of UPORT1 (writing FFH then 00H) produces the strongest sound on real hardware.</p>

<h4>Port 2 (UPORT2, 92H) — DAC/ADC Interface</h4>
<p>Port 2 is connected to the DAC (Digital-to-Analog Converter) when configured as output, or reads the ADC result when configured as input.</p>
<pre class="guide-code">; Setup for DAC output
        MOV AL, 03H
        OUT UMODEREG, AL        ; Port 2 = output mode (86H)

; Write DAC value
        MOV AL, 80H             ; mid-range voltage
        OUT UPORT2, AL          ; output to DAC (92H)

; Setup for ADC read
        MOV AL, 00H
        OUT UMODEREG, AL        ; Port 2 = input mode</pre>

<h4>Piezo Buzzer — Generating Tones</h4>
<p>The piezo is driven by creating a square wave on Port 1. Toggle the port at the desired frequency:</p>
<pre class="guide-code">; Play a tone: SI = half-period (higher = lower pitch)
PLAY:   MOV AL, 0FFH
        OUT UPORT1, AL          ; all bits HIGH
        MOV CX, SI
        NOP
        LOOP $                  ; delay
        MOV AL, 00H
        OUT UPORT1, AL          ; all bits LOW
        MOV CX, SI
        NOP
        LOOP $                  ; delay
        DEC DI                  ; repeat counter
        JNZ PLAY
        RET</pre>
<p class="guide-note"><strong>Frequency formula:</strong> f = 1 / (2 &times; SI &times; loop_time). At 8 MHz, each LOOP iteration &asymp; 2.5&mu;s. For 440 Hz (A4): SI &asymp; 1/(2 &times; 440 &times; 2.5&mu;s) &asymp; 454.</p>

<h4>Motor Control (via DAC)</h4>
<pre class="guide-code">; Enable DAC and set motor speed
        MOV AL, 03H
        OUT UMODEREG, AL        ; Port 2 output
        MOV AL, 6BH
        OUT UPORT1CTL, AL       ; Port 1 direction

        AND AL, 0FEH            ; clear bit 0 (EN=0 → enable DAC)
        OUT UPORT1, AL

        MOV AL, 0C0H            ; speed value (0-255)
        OUT UPORT2, AL          ; DAC output</pre>

<h4>Ultrasonic Distance Measurement</h4>
<pre class="guide-code">; Send ultrasonic pulse and measure echo time
        OR  AL, 40H             ; set bit 6 (UTX on)
        OUT UPORT1, AL
        ; ... short delay ...
        AND AL, 0BFH            ; clear bit 6 (UTX off)
        OUT UPORT1, AL
        ; ... measure time until bit 7 (URX) goes low ...</pre>`,

// ─── TAB 6: INT 28H REFERENCE ──────────────────────────────
int28h: `<h3>INT 28H — PAT Monitor Functions</h3>
<p>The PAT monitor provides system services through <code>INT 28H</code>. Set the function number in <code>AH</code> before calling.</p>

<h4>Quick Reference</h4>
<table><tr><th>AH</th><th>Name</th><th>Input</th><th>Action</th></tr>
<tr><td>0</td><td><code>READ</code></td><td>CX=count, DI=buffer</td><td>Read characters into buffer</td></tr>
<tr><td>1</td><td><code>READLN</code></td><td>CX=max, DI=buffer</td><td>Read line (with newline) into buffer</td></tr>
<tr><td>2</td><td><code>WRITE</code></td><td>CX=count, DI=buffer</td><td>Write CX characters from [DS:DI] to display</td></tr>
<tr><td>3</td><td><code>WRITLN</code></td><td>CX=count, DI=buffer</td><td>Write string followed by newline</td></tr>
<tr><td>4</td><td><code>EXIT</code></td><td>—</td><td>Exit program and return to PAT monitor</td></tr>
<tr><td>5</td><td><code>PERR</code></td><td>—</td><td>Print error message</td></tr>
<tr><td>6</td><td><code>AHEXTO</code></td><td>AL=char</td><td>Convert ASCII hex character to value</td></tr>
<tr><td>7</td><td><code>ADECTO</code></td><td>AL=char</td><td>Convert ASCII decimal character to value</td></tr>
<tr><td>8</td><td><code>TOAHEX</code></td><td>AL=value</td><td>Convert nibble to ASCII hex character</td></tr>
<tr><td>9</td><td><code>TOADEC</code></td><td>AL=value</td><td>Convert value to ASCII decimal</td></tr>
<tr><td>10</td><td><code>RDCHAR</code></td><td>—</td><td>Read one character (waits for input) &rarr; AL</td></tr>
<tr><td>11</td><td><code>RDBYTE</code></td><td>—</td><td>Read two hex chars as byte &rarr; AL</td></tr>
<tr><td>12</td><td><code>WRCHAR</code></td><td>AL=char</td><td>Write one character to display</td></tr>
<tr><td>13</td><td><code>WRBYTE</code></td><td>AL=value</td><td>Write byte as 2-digit hex (e.g. "3F")</td></tr>
<tr><td>14</td><td><code>GETIN</code></td><td>—</td><td>Get key without waiting &rarr; AL (FFH if none)</td></tr>
<tr><td>15</td><td><code>WT1MS</code></td><td>—</td><td>Wait 1 millisecond</td></tr>
<tr><td>16</td><td><code>WTNMS</code></td><td>BX=ms</td><td>Wait BX milliseconds</td></tr>
<tr><td>17</td><td><code>CRLF</code></td><td>—</td><td>Output carriage return + line feed</td></tr>
<tr><td>18</td><td><code>CLRSCR</code></td><td>—</td><td>Clear the display</td></tr>
<tr><td>19</td><td><code>LEDON</code></td><td>—</td><td>Turn on status LED</td></tr>
<tr><td>20</td><td><code>LEDOFF</code></td><td>—</td><td>Turn off status LED</td></tr>
<tr><td>21</td><td><code>TONE</code></td><td>BX=freq, CX=ms</td><td>Play tone (BX Hz for CX milliseconds)</td></tr>
<tr><td>22</td><td><code>NOTOFF</code></td><td>—</td><td>Turn off piezo sound</td></tr></table>

<h4>Common Patterns</h4>
<pre class="guide-code">; Exit program cleanly
        MOV AH, EXIT            ; AH = 4
        INT 28H

; Print a character
        MOV AL, 'A'
        MOV AH, WRCHAR          ; AH = 12
        INT 28H

; Print AL as hex
        MOV AH, WRBYTE          ; AH = 13
        INT 28H                 ; displays "XX" on screen

; Wait 500 ms
        MOV BX, 500
        MOV AH, WTNMS           ; AH = 16
        INT 28H

; Print a string
        MOV DI, OFFSET MSG      ; pointer to string
        MOV CX, 5               ; length
        MOV AH, WRITE           ; AH = 2
        INT 28H

; Play 1000 Hz tone for 200 ms
        MOV BX, 1000            ; frequency
        MOV CX, 200             ; duration
        MOV AH, TONE            ; AH = 21
        INT 28H</pre>

<h4>Simulator vs. Hardware</h4>
<table><tr><th>Function</th><th>Simulator</th><th>Real hardware</th></tr>
<tr><td>WRCHAR / WRBYTE</td><td>Output appears in the Display panel</td><td>Output appears on serial terminal</td></tr>
<tr><td>WRITE / WRITLN</td><td>String shown in Display panel</td><td>String sent to serial output</td></tr>
<tr><td>GETIN / RDCHAR</td><td>Reads from keyboard events</td><td>Reads from serial input / keypad</td></tr>
<tr><td>WT1MS / WTNMS</td><td>Simulated delay (pauses execution)</td><td>Real hardware delay</td></tr>
<tr><td>TONE / NOTOFF</td><td>Plays audio through browser speakers</td><td>Drives piezo on applications module</td></tr>
<tr><td>EXIT</td><td>Halts simulator</td><td>Returns to PAT monitor prompt</td></tr></table>
<p class="guide-note"><strong>Important:</strong> On real hardware, INT 28H may clobber registers (especially DX). Save any registers you need before calling INT 28H.</p>`,

// ─── TAB 7: TIPS & EXAMPLES ────────────────────────────────
tips: `<h3>Tips &amp; Common Patterns</h3>

<h4>Common Beginner Mistakes</h4>
<table><tr><th>Mistake</th><th>Fix</th></tr>
<tr><td>Forgetting <code>BYTE PTR</code> or <code>WORD PTR</code></td><td><code>MOV BYTE PTR [SI], 5</code> — the assembler needs to know if you mean byte or word</td></tr>
<tr><td>Using <code>MOV</code> to set flags</td><td>MOV doesn't affect flags. Use <code>CMP</code>, <code>TEST</code>, or an arithmetic instruction instead</td></tr>
<tr><td>Forgetting to initialize DS</td><td>DS is set to 0080H by default, which is correct. Don't change it unless you know what you're doing</td></tr>
<tr><td><code>LOOP</code> with CX=0</td><td>LOOP decrements first: CX goes from 0 to FFFFh and loops 65536 times! Check CX before LOOP or use <code>JCXZ</code></td></tr>
<tr><td>Stack misalignment</td><td>Every PUSH must have a matching POP. Mismatched pushes corrupt the return address for RET</td></tr>
<tr><td><code>DIV</code> overflow</td><td>If AX / src doesn't fit in AL (byte div) you get a divide error. Clear AH before byte division: <code>XOR AH,AH</code></td></tr>
<tr><td>Hex numbers starting with A-F</td><td>Must have a leading zero: <code>0FFH</code> not <code>FFH</code> (assembler thinks FFH is a label)</td></tr>
<tr><td>No <code>EXIT</code> at end</td><td>Without <code>MOV AH,4 / INT 28H</code>, the CPU executes random bytes after your code</td></tr></table>

<h4>Useful Code Patterns</h4>

<h5>Zero a register (fast)</h5>
<pre class="guide-code">        XOR AX, AX              ; AX = 0 (faster/smaller than MOV AX, 0)</pre>

<h5>Copy a block of memory</h5>
<pre class="guide-code">        MOV SI, 1000H           ; source
        MOV DI, 2000H           ; destination
        MOV CX, 100             ; byte count
        CLD                     ; forward direction
        REP MOVSB               ; copy CX bytes</pre>

<h5>Fill memory with a value</h5>
<pre class="guide-code">        MOV DI, 3000H           ; destination
        MOV CX, 50              ; count
        MOV AL, 0FFH            ; fill value
        CLD
        REP STOSB               ; fill CX bytes with AL</pre>

<h5>Signed comparison</h5>
<pre class="guide-code">        CMP AX, BX
        JL  AX_LESS             ; signed: jump if AX < BX
        JG  AX_GREATER          ; signed: jump if AX > BX
        ; equal
        JMP DONE

; For unsigned:
        CMP AX, BX
        JB  AX_BELOW            ; unsigned: jump if AX < BX
        JA  AX_ABOVE            ; unsigned: jump if AX > BX</pre>

<h5>Multiply by a constant</h5>
<pre class="guide-code">; Multiply AL by 10
        MOV BL, 10
        MUL BL                  ; AX = AL * 10

; Multiply by powers of 2 using shifts
        SHL AX, 1               ; AX = AX * 2
        SHL AX, 1               ; AX = AX * 4 (shifted twice total)</pre>

<h5>Print a number as decimal</h5>
<pre class="guide-code">; Print AX as decimal (0-65535)
        MOV BX, 10
        XOR CX, CX             ; digit counter
PDLOOP: XOR DX, DX
        DIV BX                  ; AX = AX/10, DX = remainder
        PUSH DX                 ; save digit
        INC CX
        TEST AX, AX
        JNZ PDLOOP
PDOUT:  POP AX                  ; retrieve digit (last-in first-out)
        ADD AL, '0'             ; convert to ASCII
        MOV AH, WRCHAR
        INT 28H
        LOOP PDOUT</pre>

<h5>Subroutine with stack frame</h5>
<pre class="guide-code">MYFUNC: PUSH BP
        MOV BP, SP
        ; [BP+4] = first parameter (pushed before CALL)
        ; [BP+2] = return address
        MOV AX, [BP+4]         ; get parameter
        ; ... do work ...
        POP BP
        RET</pre>

<h4>Program Templates</h4>
<p>Every program should follow this basic structure:</p>
<pre class="guide-code">        INCLUDE PATCALLS.INC
        ORG 0100H               ; or 0300H

; ---- initialization ----
        ; set up ports, variables, etc.

; ---- main logic ----
        ; your code

; ---- exit ----
        MOV AH, EXIT
        INT 28H

; ---- subroutines ----
; MYSUB: ...
;        RET

; ---- data ----
; MSG   DB 'text', 0
; TABLE DW 100, 200, 300

        END</pre>`
};

let guideTab = 'overview';
function openGuide() { document.getElementById('guideOv').hidden = false; renderGuide(); }
function closeGuide() { document.getElementById('guideOv').hidden = true; }
function setGuideTab(t) { guideTab = t; renderGuide(); }
function renderGuide() {
  let tabs = ['overview','registers','instructions','syntax','io_ports','int28h','tips'];
  let labels = ['Overview','Registers','Instructions','Syntax','I/O &amp; Hardware','INT 28H','Tips'];
  let html = '<div class="guide-tabs">';
  for (let i = 0; i < tabs.length; i++) {
    html += `<button class="guide-tab${guideTab===tabs[i]?' on':''}" onclick="setGuideTab('${tabs[i]}')">${labels[i]}</button>`;
  }
  html += '</div>';
  html += GUIDE_HTML[guideTab] || '';
  document.getElementById('guideBody').innerHTML = html;
}
