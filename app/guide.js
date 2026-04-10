// ============================================================
// PAT-286 Workbench — Reference Guide
// ============================================================

const GUIDE_HTML = {

overview: `<h3>PAT-286 Workbench</h3>
<p>Browser-based 8086 assembly IDE, simulator, and hardware interface for the DigiAC2000 PAT-286 board.</p>

<div class="guide-grid">
<div class="guide-card">
<div class="guide-card-h">Workflow</div>
<div class="guide-steps">
<div class="guide-step"><span class="gs-n">1</span> Pick a file from <b>Explorer</b> or create new</div>
<div class="guide-step"><span class="gs-n">2</span> <kbd>Ctrl+Enter</kbd> &rarr; Assemble</div>
<div class="guide-step"><span class="gs-n">3</span> <b>Step</b> / <b>Run</b> in simulator</div>
<div class="guide-step"><span class="gs-n">4</span> Connect USB &rarr; <b>Upload and Run</b> on hardware</div>
</div>
</div>
<div class="guide-card">
<div class="guide-card-h">Shortcuts</div>
<table><tr><td><kbd>Ctrl+Enter</kbd></td><td>Assemble</td></tr>
<tr><td><kbd>F1</kbd></td><td>Toggle this guide</td></tr>
<tr><td><kbd>Esc</kbd></td><td>Close modals</td></tr></table>
</div>
<div class="guide-card">
<div class="guide-card-h">Debugging</div>
<table><tr><td>Breakpoints</td><td>Click line numbers</td></tr>
<tr><td>&larr; / &rarr;</td><td>Step back / forward</td></tr>
<tr><td>Memory</td><td>Click IP/SP to follow</td></tr>
<tr><td>Watch</td><td>Track any expression</td></tr></table>
</div>
<div class="guide-card">
<div class="guide-card-h">System</div>
<table><tr><td>CPU</td><td>Intel 8086 (real mode)</td></tr>
<tr><td>Memory</td><td>1 MB &mdash; segment:offset</td></tr>
<tr><td>CS=DS=SS</td><td>0080H</td></tr>
<tr><td>ORG</td><td>0100H (default)</td></tr>
<tr><td>SP</td><td>FFF0H &darr;</td></tr>
<tr><td>I/O</td><td>8256 MUART (80H&ndash;9EH)</td></tr></table>
</div>
</div>

<h4>USB Serial Connection</h4>
<p>Click <b>Device</b> &rarr; select port &rarr; green dot = connected (9600 baud, 8N2). Reset the PAT board before uploading.</p>

<h4>Display Module (Keypad/Display)</h4>
<p>The PAT keyboard display uses the monitor&rsquo;s <code>WRITE</code> function with device <code>DKD=3</code>:</p>
<pre class="guide-code">        MOV     DI, OFFSET MSG
        MOV     CX, 5           ; character count
        MOV     BL, 3           ; DKD device
        MOV     AH, 2           ; WRITE function
        INT     40H             ; call monitor
MSG     DB      "HELLO"</pre>
<p class="guide-note"><code>KYDBUF (047DH)</code> is the monitor&rsquo;s internal display buffer. <code>INT 40H</code> = <code>INT USER</code> = same as <code>INT 28H</code>.</p>`,

registers: `<h3>Registers</h3>
<div class="guide-grid guide-grid-2">
<div class="guide-card">
<div class="guide-card-h">General Purpose (16-bit &rarr; 8-bit halves)</div>
<table class="guide-reg-tbl">
<tr><th>16</th><th>Hi</th><th>Lo</th><th>Used for</th></tr>
<tr><td><code>AX</code></td><td><code>AH</code></td><td><code>AL</code></td><td>Accumulator, I/O, INT function#</td></tr>
<tr><td><code>BX</code></td><td><code>BH</code></td><td><code>BL</code></td><td>Base addressing, device#</td></tr>
<tr><td><code>CX</code></td><td><code>CH</code></td><td><code>CL</code></td><td>Counter (LOOP, REP, shifts)</td></tr>
<tr><td><code>DX</code></td><td><code>DH</code></td><td><code>DL</code></td><td>Data, MUL/DIV high, port addr</td></tr>
</table>
</div>
<div class="guide-card">
<div class="guide-card-h">Index, Pointer &amp; Segment</div>
<table>
<tr><td><code>SI</code></td><td>Source index</td><td><code>CS</code> 0080H</td><td>Code</td></tr>
<tr><td><code>DI</code></td><td>Dest index</td><td><code>DS</code> 0080H</td><td>Data</td></tr>
<tr><td><code>SP</code></td><td>Stack ptr &darr;</td><td><code>SS</code> 0080H</td><td>Stack</td></tr>
<tr><td><code>BP</code></td><td>Base ptr</td><td><code>ES</code> 0000H</td><td>Extra</td></tr>
</table>
</div>
</div>

<h4>FLAGS</h4>
<div class="guide-flags">
<div class="gf"><span class="gf-bit">0</span><code>CF</code> Carry</div>
<div class="gf"><span class="gf-bit">2</span><code>PF</code> Parity</div>
<div class="gf"><span class="gf-bit">4</span><code>AF</code> Aux carry</div>
<div class="gf"><span class="gf-bit">6</span><code>ZF</code> Zero</div>
<div class="gf"><span class="gf-bit">7</span><code>SF</code> Sign</div>
<div class="gf"><span class="gf-bit">9</span><code>IF</code> Interrupt</div>
<div class="gf"><span class="gf-bit">10</span><code>DF</code> Direction</div>
<div class="gf"><span class="gf-bit">11</span><code>OF</code> Overflow</div>
</div>
<p class="guide-note"><code>CMP A,B</code> sets flags as if computing A&minus;B but discards the result. Conditional jumps read these flags. <code>MOV</code> does NOT change flags.</p>`,

instructions: `<h3>Instruction Set</h3>

<div class="guide-grid guide-grid-2">
<div class="guide-card">
<div class="guide-card-h">Data Movement</div>
<table><tr><td><code>MOV d,s</code></td><td>d &larr; s</td></tr>
<tr><td><code>PUSH / POP</code></td><td>Stack push/pop (regs incl. seg)</td></tr>
<tr><td><code>PUSHA/POPA</code></td><td>All GPRs at once</td></tr>
<tr><td><code>PUSHF/POPF</code></td><td>FLAGS register</td></tr>
<tr><td><code>XCHG a,b</code></td><td>Swap a &amp; b</td></tr>
<tr><td><code>LEA r,[m]</code></td><td>Load address (not value)</td></tr>
<tr><td><code>CBW/CWD</code></td><td>Sign-extend AL&rarr;AX / AX&rarr;DX:AX</td></tr>
<tr><td><code>XLAT</code></td><td>AL &larr; [BX+AL]</td></tr></table>
</div>
<div class="guide-card">
<div class="guide-card-h">Arithmetic</div>
<table><tr><td><code>ADD/SUB</code></td><td>Add / subtract</td></tr>
<tr><td><code>ADC/SBB</code></td><td>With carry/borrow</td></tr>
<tr><td><code>INC/DEC</code></td><td>+1 / &minus;1 (no CF!)</td></tr>
<tr><td><code>NEG</code></td><td>Two&rsquo;s complement negate</td></tr>
<tr><td><code>CMP a,b</code></td><td>Flags from a&minus;b</td></tr>
<tr><td><code>MUL/IMUL</code></td><td>Unsigned/signed multiply</td></tr>
<tr><td><code>DIV/IDIV</code></td><td>Unsigned/signed divide</td></tr>
<tr><td><code>DAA DAS AAA AAS AAM AAD</code></td><td>BCD adjust</td></tr></table>
</div>
<div class="guide-card">
<div class="guide-card-h">Logic &amp; Shift</div>
<table><tr><td><code>AND/OR/XOR</code></td><td>Bitwise (CF=OF=0)</td></tr>
<tr><td><code>NOT</code></td><td>Bitwise complement</td></tr>
<tr><td><code>TEST a,b</code></td><td>Flags from a AND b</td></tr>
<tr><td><code>SHL/SHR/SAR</code></td><td>Shift L/R/arith R</td></tr>
<tr><td><code>ROL/ROR</code></td><td>Rotate left/right</td></tr>
<tr><td><code>RCL/RCR</code></td><td>Rotate through carry</td></tr></table>
</div>
<div class="guide-card">
<div class="guide-card-h">Control Flow</div>
<table><tr><td><code>JMP</code></td><td>Unconditional</td></tr>
<tr><td><code>JZ/JE &middot; JNZ/JNE</code></td><td>Zero / not zero</td></tr>
<tr><td><code>JC/JB &middot; JNC/JAE</code></td><td>Carry (unsigned &lt;/&ge;)</td></tr>
<tr><td><code>JL &middot; JGE</code></td><td>Signed &lt; / &ge;</td></tr>
<tr><td><code>JLE &middot; JG</code></td><td>Signed &le; / &gt;</td></tr>
<tr><td><code>JA &middot; JBE</code></td><td>Unsigned &gt; / &le;</td></tr>
<tr><td><code>JS JNS JO JNO JP JNP</code></td><td>Sign/overflow/parity</td></tr>
<tr><td><code>JCXZ</code></td><td>Jump if CX=0</td></tr>
<tr><td><code>LOOP</code></td><td>CX&minus;&minus;; jump if CX&ne;0</td></tr>
<tr><td><code>LOOPZ/LOOPNZ</code></td><td>+ZF condition</td></tr>
<tr><td><code>CALL/RET</code></td><td>Subroutine</td></tr>
<tr><td><code>INT n / IRET</code></td><td>Software interrupt</td></tr>
<tr><td><code>HLT</code></td><td>Halt</td></tr></table>
</div>
<div class="guide-card">
<div class="guide-card-h">String Operations</div>
<table><tr><td><code>MOVSB/W</code></td><td>[DS:SI] &rarr; [ES:DI]</td></tr>
<tr><td><code>STOSB/W</code></td><td>AL/AX &rarr; [ES:DI]</td></tr>
<tr><td><code>LODSB/W</code></td><td>[DS:SI] &rarr; AL/AX</td></tr>
<tr><td><code>CMPSB/W</code></td><td>Compare [SI] vs [DI]</td></tr>
<tr><td><code>SCASB/W</code></td><td>Compare AL vs [DI]</td></tr>
<tr><td><code>REP</code></td><td>Repeat CX times</td></tr>
<tr><td><code>REPE/REPNE</code></td><td>Repeat while =/ &ne;</td></tr>
<tr><td><code>CLD/STD</code></td><td>Direction: fwd/back</td></tr></table>
</div>
<div class="guide-card">
<div class="guide-card-h">I/O &amp; Flag Control</div>
<table><tr><td><code>IN AL,port</code></td><td>Read from I/O port</td></tr>
<tr><td><code>OUT port,AL</code></td><td>Write to I/O port</td></tr>
<tr><td><code>CLC/STC/CMC</code></td><td>Clear/set/flip CF</td></tr>
<tr><td><code>CLI/STI</code></td><td>Disable/enable interrupts</td></tr>
<tr><td><code>LAHF/SAHF</code></td><td>AH &harr; low FLAGS</td></tr>
<tr><td><code>NOP</code></td><td>No operation</td></tr></table>
</div>
</div>`,

syntax: `<h3>Assembler Syntax</h3>

<h4>Program Template</h4>
<pre class="guide-code">        INCLUDE PATCALLS.INC
        ORG     0100H

START:  ; your code here

        MOV     AH, EXIT
        INT     28H
        END</pre>

<div class="guide-grid guide-grid-2">
<div class="guide-card">
<div class="guide-card-h">Directives</div>
<table><tr><td><code>ORG addr</code></td><td>Set starting address</td></tr>
<tr><td><code>DB val,...</code></td><td>Define bytes / strings</td></tr>
<tr><td><code>DW val,...</code></td><td>Define words (16-bit)</td></tr>
<tr><td><code>EQU expr</code></td><td>Named constant</td></tr>
<tr><td><code>INCLUDE</code></td><td>Include PATCALLS.INC</td></tr>
<tr><td><code>END</code></td><td>End of source</td></tr></table>
</div>
<div class="guide-card">
<div class="guide-card-h">Number Formats</div>
<table><tr><td><code>0FFH</code></td><td>Hex (leading 0 if A&ndash;F)</td></tr>
<tr><td><code>255</code></td><td>Decimal</td></tr>
<tr><td><code>11111111B</code></td><td>Binary</td></tr>
<tr><td><code>'A'</code></td><td>ASCII (65)</td></tr></table>
</div>
<div class="guide-card">
<div class="guide-card-h">Memory Operands</div>
<table><tr><td><code>[BX]</code></td><td>DS:BX</td></tr>
<tr><td><code>[SI+5]</code></td><td>DS:SI+5</td></tr>
<tr><td><code>[BX+SI]</code></td><td>DS:BX+SI</td></tr>
<tr><td><code>[BP+4]</code></td><td>SS:BP+4</td></tr>
<tr><td><code>ES:[DI]</code></td><td>Segment override</td></tr>
<tr><td><code>BYTE PTR [SI]</code></td><td>Force byte size</td></tr>
<tr><td><code>WORD PTR [SI]</code></td><td>Force word size</td></tr>
<tr><td><code>OFFSET label</code></td><td>Address of label</td></tr></table>
</div>
<div class="guide-card">
<div class="guide-card-h">PATCALLS.INC Constants</div>
<table class="guide-sm-tbl">
<tr><td><code>USRSEG</code>=80H</td><td><code>USRBSE</code>=100H</td></tr>
<tr><td><code>UPORT1</code>=90H</td><td><code>UPORT2</code>=92H</td></tr>
<tr><td><code>UPORT1CTL</code>=88H</td><td><code>UMODEREG</code>=86H</td></tr>
<tr><td><code>UCRREG1</code>=80H</td><td><code>UTIMER1</code>=94H</td></tr>
<tr><td><code>UIRQEN</code>=8AH</td><td><code>UIRQADR</code>=8CH</td></tr>
<tr><td><code>EXIT</code>=4</td><td><code>WRCHAR</code>=12</td></tr>
<tr><td><code>WRBYTE</code>=13</td><td><code>CLRSCR</code>=18</td></tr>
<tr><td><code>WT1MS</code>=15</td><td><code>WTNMS</code>=16</td></tr>
<tr><td><code>GETIN</code>=14</td><td><code>RDCHAR</code>=10</td></tr>
<tr><td><code>TONE</code>=21</td><td><code>NOTOFF</code>=22</td></tr>
<tr><td><code>LEDON</code>=19</td><td><code>LEDOFF</code>=20</td></tr>
<tr><td><code>DKD</code>=3</td><td><code>KYDBUF</code>=47DH</td></tr>
</table>
</div>
</div>
<p class="guide-note"><b>PTR tip:</b> If one operand is memory and the other is an immediate, you MUST use <code>BYTE PTR</code> or <code>WORD PTR</code>. Example: <code>MOV BYTE PTR [SI], 5</code></p>`,

io_ports: `<h3>I/O &amp; Hardware</h3>

<h4>MUART 8256 Registers (80H&ndash;9EH)</h4>
<table><tr><th>Port</th><th>Name</th><th>Function</th></tr>
<tr><td><code>80H</code></td><td>UCRREG1</td><td>Command reg 1 (clock/baud)</td></tr>
<tr><td><code>86H</code></td><td>UMODEREG</td><td>Port 2 dir: 03H=out, 00H=in</td></tr>
<tr><td><code>88H</code></td><td>UPORT1CTL</td><td>Port 1 bit direction (1=out)</td></tr>
<tr><td><code>8AH</code></td><td>UIRQEN</td><td>IRQ enable (bit0=Timer1)</td></tr>
<tr><td><code>8CH</code></td><td>UIRQADR</td><td>IRQ address (read clears)</td></tr>
<tr><td><code>90H</code></td><td>UPORT1</td><td>Port 1 data (8-bit I/O)</td></tr>
<tr><td><code>92H</code></td><td>UPORT2</td><td>Port 2 data (DAC/ADC)</td></tr>
<tr><td><code>94H</code></td><td>UTIMER1</td><td>Timer 1 value</td></tr></table>

<h4>Port 1 Bit Map (UPORT1 = 90H)</h4>
<table><tr><th>Bit</th><th>Name</th><th>Dir</th><th>Function</th></tr>
<tr><td>0</td><td>EN</td><td>Out</td><td>DAC enable (active low)</td></tr>
<tr><td>1</td><td>WR</td><td>Out</td><td>ADC start (falling edge)</td></tr>
<tr><td>2</td><td>BSY</td><td>In</td><td>ADC busy (0=converting)</td></tr>
<tr><td>3</td><td>RD</td><td>Out</td><td>ADC read (active low)</td></tr>
<tr><td>4</td><td>DSC</td><td>In</td><td>Disk encoder pulse</td></tr>
<tr><td>5</td><td>PZO</td><td>Out</td><td>Piezo buzzer</td></tr>
<tr><td>6</td><td>UTX</td><td>Out</td><td>Ultrasonic TX</td></tr>
<tr><td>7</td><td>URX</td><td>In</td><td>Ultrasonic RX</td></tr></table>

<div class="guide-grid guide-grid-2">
<div class="guide-card">
<div class="guide-card-h">Piezo Buzzer</div>
<pre class="guide-code">; Toggle all UPORT1 bits for sound
MOV AL,0FFH
OUT UPORT1CTL,AL  ; all output
PLAY:
MOV AL,0FFH
OUT UPORT1,AL     ; HIGH
MOV CX,SI         ; delay
LOOP $
MOV AL,00H
OUT UPORT1,AL     ; LOW
MOV CX,SI         ; delay
LOOP $
DEC DI
JNZ PLAY</pre>
<p class="guide-note">f = 1/(2 &times; SI &times; 2.5&mu;s). A4=440Hz &rArr; SI&asymp;454</p>
</div>
<div class="guide-card">
<div class="guide-card-h">DAC / Motor Control</div>
<pre class="guide-code">; Setup Port 2 as output
MOV AL,03H
OUT UMODEREG,AL
; Enable DAC (bit0=0)
MOV AL,0FEH
OUT UPORT1,AL
; Set voltage (0-255)
MOV AL,0C0H
OUT UPORT2,AL</pre>
</div>
</div>`,

int28h: `<h3>INT 28H &mdash; PAT Monitor</h3>
<p>Set function in <code>AH</code>, then <code>INT 28H</code> (or <code>INT 40H</code> = <code>INT USER</code>).</p>

<table><tr><th>AH</th><th>Name</th><th>Input</th><th>Action</th></tr>
<tr><td>0</td><td>READ</td><td>CX, DI</td><td>Read chars into [DS:DI]</td></tr>
<tr><td>1</td><td>READLN</td><td>CX, DI</td><td>Read line into [DS:DI]</td></tr>
<tr><td>2</td><td>WRITE</td><td>CX, DI, BL</td><td>Write CX chars from [DS:DI] to device BL</td></tr>
<tr><td>3</td><td>WRITLN</td><td>CX, DI, BL</td><td>Write + newline</td></tr>
<tr><td>4</td><td>EXIT</td><td>&mdash;</td><td>Return to monitor</td></tr>
<tr><td>10</td><td>RDCHAR</td><td>&mdash;</td><td>Read char &rarr; AL (waits)</td></tr>
<tr><td>12</td><td>WRCHAR</td><td>AL</td><td>Write one character</td></tr>
<tr><td>13</td><td>WRBYTE</td><td>AL</td><td>Write byte as hex ("3F")</td></tr>
<tr><td>14</td><td>GETIN</td><td>&mdash;</td><td>Get key &rarr; AL (FFH if none)</td></tr>
<tr><td>15</td><td>WT1MS</td><td>&mdash;</td><td>Wait 1 ms</td></tr>
<tr><td>16</td><td>WTNMS</td><td>BX</td><td>Wait BX ms</td></tr>
<tr><td>17</td><td>CRLF</td><td>&mdash;</td><td>Output newline</td></tr>
<tr><td>18</td><td>CLRSCR</td><td>&mdash;</td><td>Clear display</td></tr>
<tr><td>19</td><td>LEDON</td><td>&mdash;</td><td>LED on</td></tr>
<tr><td>20</td><td>LEDOFF</td><td>&mdash;</td><td>LED off</td></tr>
<tr><td>21</td><td>TONE</td><td>BX, CX</td><td>Play BX Hz for CX ms</td></tr>
<tr><td>22</td><td>NOTOFF</td><td>&mdash;</td><td>Stop sound</td></tr></table>

<h4>Common Patterns</h4>
<div class="guide-grid guide-grid-3">
<div class="guide-card">
<pre class="guide-code">; Exit program
MOV AH, EXIT
INT 28H</pre>
</div>
<div class="guide-card">
<pre class="guide-code">; Print char
MOV AL, 'A'
MOV AH, WRCHAR
INT 28H</pre>
</div>
<div class="guide-card">
<pre class="guide-code">; Print hex
MOV AH, WRBYTE
INT 28H</pre>
</div>
<div class="guide-card">
<pre class="guide-code">; Wait 500ms
MOV BX, 500
MOV AH, WTNMS
INT 28H</pre>
</div>
<div class="guide-card">
<pre class="guide-code">; Play 1kHz 200ms
MOV BX, 1000
MOV CX, 200
MOV AH, TONE
INT 28H</pre>
</div>
<div class="guide-card">
<pre class="guide-code">; Print string
MOV DI, OFFSET MSG
MOV CX, 5
MOV AH, WRITE
INT 28H</pre>
</div>
</div>
<p class="guide-note"><b>WRITE device numbers:</b> BL=2 (serial/printer), BL=3 (DKD keypad/display). Default (WRCHAR etc.) goes to the active terminal device.</p>
<p class="guide-note"><b>Warning:</b> On real hardware, INT 28H may clobber registers (especially DX). Save registers you need before calling.</p>`,

tips: `<h3>Tips &amp; Gotchas</h3>

<h4>Common Mistakes</h4>
<table><tr><th>Mistake</th><th>Fix</th></tr>
<tr><td>No <code>BYTE/WORD PTR</code></td><td><code>MOV BYTE PTR [SI], 5</code> &mdash; assembler needs size</td></tr>
<tr><td><code>MOV</code> to set flags</td><td>Use <code>CMP</code>, <code>TEST</code>, or arithmetic</td></tr>
<tr><td><code>LOOP</code> with CX=0</td><td>CX wraps to FFFFh &rarr; 65536 iterations! Use <code>JCXZ</code></td></tr>
<tr><td>Stack mismatch</td><td>Every PUSH needs a POP. Misalignment corrupts RET</td></tr>
<tr><td><code>DIV</code> overflow</td><td>Clear AH before byte div: <code>XOR AH,AH</code></td></tr>
<tr><td>Hex starts with A&ndash;F</td><td>Add leading 0: <code>0FFH</code> not <code>FFH</code></td></tr>
<tr><td>No EXIT at end</td><td>CPU runs into garbage. Always <code>MOV AH,4 / INT 28H</code></td></tr>
<tr><td><code>INC</code> for carry test</td><td>INC/DEC don&rsquo;t touch CF. Use <code>ADD</code> if you need CF</td></tr></table>

<h4>Useful Patterns</h4>
<div class="guide-grid guide-grid-2">
<div class="guide-card">
<div class="guide-card-h">Zero a register</div>
<pre class="guide-code">XOR AX, AX   ; faster than MOV AX,0</pre>
</div>
<div class="guide-card">
<div class="guide-card-h">Copy memory block</div>
<pre class="guide-code">MOV SI, 1000H  ; source
MOV DI, 2000H  ; dest
MOV CX, 100    ; count
CLD
REP MOVSB</pre>
</div>
<div class="guide-card">
<div class="guide-card-h">Signed vs Unsigned</div>
<pre class="guide-code">CMP AX, BX
JL  LESS    ; signed &lt;
JB  BELOW   ; unsigned &lt;</pre>
</div>
<div class="guide-card">
<div class="guide-card-h">Multiply by constant</div>
<pre class="guide-code">SHL AX, 1   ; &times;2
SHL AX, 1   ; &times;4
; or:
MOV BL, 10
MUL BL      ; AX = AL&times;10</pre>
</div>
<div class="guide-card">
<div class="guide-card-h">Print decimal</div>
<pre class="guide-code">MOV BX, 10
XOR CX, CX
DIV_LP:
  XOR DX, DX
  DIV BX      ; AX/10, rem DX
  PUSH DX
  INC CX
  TEST AX, AX
  JNZ DIV_LP
PR_LP:
  POP AX
  ADD AL, '0'
  MOV AH, WRCHAR
  INT 28H
  LOOP PR_LP</pre>
</div>
<div class="guide-card">
<div class="guide-card-h">Subroutine with params</div>
<pre class="guide-code">; caller:
PUSH 42     ; param
CALL MYFUNC
ADD SP, 2   ; cleanup

MYFUNC:
  PUSH BP
  MOV BP, SP
  MOV AX,[BP+4] ; param
  POP BP
  RET</pre>
</div>
</div>`
};

let guideTab = 'overview';
function openGuide() { document.getElementById('guideOv').hidden = false; renderGuide(); }
function closeGuide() { document.getElementById('guideOv').hidden = true; }
function setGuideTab(t) { guideTab = t; renderGuide(); }
function renderGuide() {
  let tabs = ['overview','registers','instructions','syntax','io_ports','int28h','tips'];
  let labels = ['Overview','Registers','Instructions','Syntax','I/O Ports','INT 28H','Tips'];
  let html = '<div class="guide-tabs">';
  for (let i = 0; i < tabs.length; i++) {
    html += `<button class="guide-tab${guideTab===tabs[i]?' on':''}" onclick="setGuideTab('${tabs[i]}')">${labels[i]}</button>`;
  }
  html += '</div>';
  html += GUIDE_HTML[guideTab] || '';
  document.getElementById('guideBody').innerHTML = html;
}
