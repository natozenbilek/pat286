// ============================================================
// PAT-286 Panels Layout — Right panel HTML generator
// ============================================================

function initCollapsibleCards() {
  document.querySelectorAll('.cd .ch').forEach(ch => {
    ch.addEventListener('click', () => {
      ch.closest('.cd').classList.toggle('collapsed');
    });
  });
}

function buildRightPanel() {
  let rp = document.getElementById('rpContent');
  if (!rp) return;

  rp.innerHTML = `
    <div class="cyc">
      <span>Cycle: <b id="cyN">0</b></span>
      <span>Instr: <b id="inN">0</b></span>
    </div>
    <div class="cd cd-hero"><div class="ch">Current instruction</div><div class="cb">
      <div class="ir-box" id="irD">&mdash;</div>
      <div class="desc-box" id="desc" style="margin-top:6px">&mdash;</div>
      <div class="diff-box" id="diffBox" style="margin-top:6px">&mdash;</div>
    </div></div>
    <div class="cd"><div class="ch">General purpose registers</div><div class="cb">
      <div class="rg rg-gp" id="rgGP"></div>
    </div></div>
    <div class="cd"><div class="ch">Segment registers</div><div class="cb">
      <div class="rg rg-seg" id="rgSeg"></div>
    </div></div>
    <div class="cd"><div class="ch">Control</div><div class="cb">
      <div class="rg rg-ctl" id="rgCtl"></div>
    </div></div>
    <div class="cd"><div class="ch">Flags</div><div class="cb">
      <div class="fr" id="flG"></div>
    </div></div>
    <div class="cd collapsed"><div class="ch">PAT Display <span class="ch-sub">INT 28H output</span></div><div class="cb">
      <div class="seg7-wrap" id="seg7Wrap"></div>
      <div class="pat-disp-lbl">7-segment display</div>
    </div></div>
    <div class="cd"><div class="ch">Stack <span class="ch-sub" id="stkInfo">SS:SP</span></div><div class="cb">
      <div class="stk" id="stkView">&mdash;</div>
    </div></div>
    <div class="cd"><div class="ch">Memory</div><div class="cb">
      <div style="display:flex;gap:6px;margin-bottom:6px;align-items:center">
        <input id="memAddr" type="text" value="0080:0100" class="mem-input" placeholder="seg:off">
        <button class="b b-out" onclick="renderMem()">View</button>
        <div class="mem-follow">
          <button class="b" id="followIP" onclick="toggleFollow('IP')" title="Auto-follow CS:IP">IP</button>
          <button class="b" id="followSP" onclick="toggleFollow('SP')" title="Auto-follow SS:SP">SP</button>
        </div>
      </div>
      <div class="mem-view-wrap">
        <div class="mg" id="memGrid"></div>
        <div class="mg-ascii" id="memAscii"></div>
      </div>
    </div></div>
    <div class="cd collapsed"><div class="ch">Execution Trace <span class="ch-sub" id="traceCount">0</span></div><div class="cb">
      <div class="trace" id="traceView"><span style="color:var(--text3)">Run program to see trace</span></div>
    </div></div>
    <div class="cd collapsed"><div class="ch">Watch</div><div class="cb">
      <div class="watch-input-row">
        <input id="watchInput" type="text" class="watch-input" placeholder="AX, DS:1000, [SI], label..." spellcheck="false">
        <button class="b b-out" onclick="addWatch()">Add</button>
      </div>
      <div id="watchList" class="watch-list"><span class="watch-empty">Add expressions (registers, addresses, labels)</span></div>
    </div></div>
    <div class="cd collapsed"><div class="ch">I/O Log <span class="ch-sub">last 30</span></div><div class="cb" style="padding:0">
      <div class="io-timeline" id="ioTimeline"></div>
      <div class="io-log" id="ioLog">&mdash;</div>
    </div></div>`;
}
