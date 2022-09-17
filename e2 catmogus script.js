let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
//2051 row at the moment when the code gets loaded, not in some button ot smth
let ws = new WebSocket(location.origin.replace(/^http/, 'ws'));
//let ws = new WebSocket("wss://evades2.herokuapp.com");
let loginKey = null;
ws.binaryType = "arraybuffer"


window.onbeforeunload = function () {
  if (state == "game") {
    return 'Do you really want to leave this page?';
  }
};

let center = { x: canvas.width / 2, y: canvas.height / 2 }
let tempCanvas = null;
let hats = [];
let selectedHat = [];
let tCtx = null;
let state = "menu";
let reason = "";
const tileSize = 40 * 0.4285 * 2;
let chatSelfRegex = null;
const hatImg = {}
let MAP_SIZE = [80, 15];
function createHat(name, multiX, multiY, dX, dY) {
  let img = new Image();
  img.src = `./hats/${name}.png`;
  hatImg[name] = {
    img: img,
    multiX: multiX,
    multiY: multiY,
    dX: dX,
    dY: dY
  };
}


let tiles = {};

function loadTexturePack(target, source, data = [{ name: "", x: 0, y: 0, w: 0, h: 0, type: "pattern", g: 0 }]) {
  let img = new Image();
  img.onload = () => {
    const tempCanvas = document.createElement("canvas");
    const tCtx = tempCanvas.getContext("2d");

    for (let i = 0; i < data.length; i++) {
      tempCanvas.width = data[i].w;
      tempCanvas.height = data[i].h;
      tCtx.drawImage(img, data[i].x, data[i].y, data[i].w, data[i].h, 0, 0, data[i].w, data[i].h);

      switch (data[i].type) {
        case "pattern":
          tiles[data[i].name] = { res: ctx.createPattern(tempCanvas, 'repeat'), g: data[i].g };
          break;
        default:
        case "image":
          tiles[data[i].name] = { res: new Image(), g: data[i].g };
          tiles[data[i].name].res.src = tempCanvas.toDataURL();
          break;
      }
    }
  }
  img.src = source;
}
loadTexturePack(tiles, "./images/tile_map.png", [
  { name: "tile_main", x: 0, y: 0, w: 40, h: 40, type: "pattern", g: 0 },
  { name: "tile_2", x: 40, y: 0, w: 40, h: 40, type: "image", g: 1 },
  { name: "tile_cc_left", x: 80, y: 0, w: 40, h: 40, type: "pattern", g: 0 },
  { name: "tile_victory", x: 120, y: 0, w: 40, h: 40, type: "pattern", g: 0 },
  { name: "tile_safezone", x: 0, y: 40, w: 40, h: 40, type: "pattern", g: 0 },
  { name: "tile_next_area", x: 40, y: 40, w: 40, h: 40, type: "pattern", g: 0 },
  { name: "tile_change_world", x: 80, y: 40, w: 40, h: 40, type: "pattern", g: 0 },
])

let serversDiv = document.getElementById("serverSelection");
const bouncyEnemyImg = new Image();
bouncyEnemyImg.src = "images/bouncyEnemy.png";
const presentEnemyImg = new Image();
presentEnemyImg.src = "images/presentEnemy.png";
const escargoImg = new Image();
escargoImg.src = "images/escargo.png";

let ability1cooldown = -1;
let ability2cooldown = -1;

let maxAbility1 = Infinity;
let maxAbility2 = Infinity;

let victoryArea = false;
let playerType;
let heroes;
let timeTaken = 999999999999999999999999;

const heusephadesAbilities = ["#889595", "#d13530", "#178031", "#3081d1"];

let anti_afk = 0;

{//generate map name colors
  let style = document.createElement("style");
  document.head.appendChild(style);
  let nhtml = "";
  for (let i in CONSTANTS.worlds) {
    if (i[0] == "_") continue;

    let data = CONSTANTS.worlds[i] && CONSTANTS.worlds[i].title || CONSTANTS.worlds["_default"].title;
    if (data == null) {
      continue;
    }
    let fs = data.fillStyleLB || data.fillStyle,
      out = data.strokeStyleLB || data.strokeStyle;
    if (typeof fs != "string" || typeof out != "string") continue;
    nhtml += `
    *[world="${i}"]{
      color: ${fs}!important;
      text-shadow: min(calc(-1.7vw * 0.05), calc(-3.0vh * 0.05)) min(calc(-1.7vw * 0.05), calc(-3.0vh * 0.05)) 2px #0003, min(calc(-1.7vw * 0.05), calc(-3.0vh * 0.05)) min(calc(1.7vw * 0.05), calc(3.0vh * 0.05)) 2px #0003, min(calc(1.7vw * 0.05), calc(3.0vh * 0.05)) min(calc(1.7vw * 0.05), calc(3.0vh * 0.05)) 2px #0003, min(calc(1.7vw * 0.05), calc(3.0vh * 0.05)) min(calc(-1.7vw * 0.05), calc(-3.0vh * 0.05)) 2px #0003;
    }

    *[class="world-name"][world="${i}"]{
      color: ${fs}!important;
      text-shadow: min(calc(1.7vw * 0.05), calc(3.0vh * 0.05)) min(calc(1.7vw * 0.05), calc(3.0vh * 0.05))  ${out}, min(calc(-1.7vw * 0.05), calc(-3.0vh * 0.05)) min(calc(1.7vw * 0.05), calc(3.0vh * 0.05)) ${out}, min(calc(-1.7vw * 0.05), calc(-3.0vh * 0.05)) min(calc(-1.7vw * 0.05), calc(-3.0vh * 0.05)) ${out}, min(calc(1.7vw * 0.05), calc(3.0vh * 0.05)) min(calc(-1.7vw * 0.05), calc(-3.0vh * 0.05)) ${out};
    }
    `
  }
  nhtml += `
  .dead[username][world]{
    opacity: 0.5;
  }`
  style.innerHTML = nhtml;

}

//
for (let hatName in CONSTANTS.hats) {
  const hatData = CONSTANTS.hats[hatName];
  if (hatData.hidden) continue;
  createHat(hatName, hatData.multiX, hatData.multiY, hatData.dX, hatData.dY);
}

document.getElementById("e1Btn").onclick = () => {
  window.onbeforeunload = function () { };
  window.location.replace("https://evades.io/");
}

const heroBoxes = document.querySelectorAll(".heroBox");
for (let i of heroBoxes) {
  i.onclick = () => {
    if (!i.classList.contains("inactive")) init(i.id);
  }
}

if (Cookies.get("lgkey") != undefined) {
  ws.addEventListener("open", () => {
    ws.send(msgpack.encode({
      klg: Cookies.get("lgkey")
    }));
  })
}

let username = null;

function d(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function show(item) {
  document.getElementById(item).style.display = "";
}
function hide(item) {
  document.getElementById(item).style.display = "none";
}

document.getElementById("logout").onclick = () => {
  Cookies.set("lgkey", null, { expires: 365 });
  ws.send(msgpack.encode({
    type: "logout"
  }));
}
document.getElementById("hats").onclick = () => {
  ws.send(msgpack.encode({
    type: "hat"
  }));
}
document.getElementById("back").onclick = () => {
  document.getElementById('hatSelection').style.display = "none";
  document.querySelector(".menu").style.display = "";
}
document.getElementById("play").onclick = () => {
  serversDiv.style.display = "";
  menu.style.display = "none";
  join.style.display = "none";
  document.getElementById('loginData').style.display = "none";
  document.getElementById("playDiv").style.display = "";
}

temp1 = "";
const serversl = [
  ["na1", "https://evades2eu-s2.herokuapp.com/".length > location.origin.length ? "evade2.herokuapp.com" : location.origin.replace(/^(http[s]):\/\//, "")],
  ["eu1", "evades2eu.herokuapp.com"],
  ["eu2", "evades2eu-s2.herokuapp.com"],
  ["na2", "e2na2.adiprk.repl.co"],
  ["na3", "e2na3.adiprk.repl.co"],
];

for (let s in serversl) {
  let ss = serversl[s];
  if (ws.url == "wss://" + ss[1] + "/") continue;
  try {
    let testWs = new WebSocket("wss://" + ss[1]);
    testWs.binaryType = "arraybuffer";

    testWs.onopen = () => { testWs.close(); }
    testWs.onerror = () => {
      console.log(`server ${ss[0]}, ${ss[1]}, is down!`);
      document.getElementById(ss[0]).style.display = "none";
    }
  } catch (err) { console.log(err) };
}

serversl.forEach((e) => {
  let odcf = () => {
    chatArea.innerText = "";
    appendChatMessage({
      "owner": "[SERVER]",
      "chat": "Press enter to chat!",
      "type": "server"
    })
    players = {};
    enemies = {};
    enemysSorted = [];
    if (ws.url == "wss://" + e[1] + "/") {
      ws.send(msgpack.encode({
        key: loginKey,
        type: "play"
      }));
    } else {
      ws = new WebSocket("wss://" + e[1]);
      ws.binaryType = "arraybuffer";
      bindWsListener(ws);
      ws.onopen = () => {
        ws.send(msgpack.encode({
          key: loginKey,
          type: "play"
        }));
      }
    }
    serversDiv.style.display = "none";
  }
  if (Cookies.get("lgkey") != undefined) {
    loginKey = Cookies.get("lgkey")
  }
  document.getElementById(e[0]).onclick = () => {
    if (ws.url != "wss://" + e[1] + "/") {
      ws.close();
      ws.onclose = odcf;
    } else {
      odcf()
    }
  }
})

function bindWsListener(ws) {
  if (leaderboardElement) leaderboardElement.serverNr = serversl.find(e => e[1] + "/" == ws.url.replace(/ws(s)?:\/\//gm, ""))[0];
  ws.onmessage = data => {
    let message = msgpack.decode(new Uint8Array(data.data));
    dataThisSecond += data.data.byteLength;

    if (message.vi != undefined) {
      victoryArea = message.vi;
    }
    if (message.sz != undefined) {
      MAP_SIZE = message.sz;
      minimap.recalcCurent();
    }
    if (message.ty) {
      playerType = message.ty;
      chatElement.initAs(playerType);
    }
    chatChecking: if (message.chat) {
      let owner = message.owner;
      let retreiver = message.retreiver;
      let txt = message.chat;
      let type = message.type;

      const typeData = CONSTANTS.chat[type] || CONSTANTS.chat["_default"];
      if (!typeData.nonBlockable) {
        if (blockedPlayers[owner]) break chatChecking;
      }

      if (retreiver) {
        if (retreiver == playername) owner = "from " + owner;
        else owner = "to " + retreiver;
      }

      let scroll =
        chatArea.scrollTop + chatArea.clientHeight >=
        chatArea.scrollHeight - 5;

      let newSpan = document.createElement("span");
      newSpan.classList.add("inlineMsg");
      newSpan.innerText = owner;
      let newDiv = document.createElement("div");


      newDiv.classList.add(typeData.className);

      let newSpan2 = document.createElement("span");
      newSpan2.classList.add("inlineMsg");

      newDiv.prepend(": " + txt);
      newDiv.prepend(newSpan);
      newDiv.style.whiteSpace = "normal";

      if (retreiver) newDiv.classList.add("dirmes");
      if (!retreiver && chatSelfRegex && chatSelfRegex.test && chatSelfRegex.test(txt)) newDiv.classList.add("mentioned");


      if (typeData.tag && !(retreiver && owner[0] == "t")) {
        let tagDiv = document.createElement("span");
        tagDiv.classList.add(typeData.tag.className);
        tagDiv.innerText = `${typeData.tag.text} `;
        newDiv.prepend(tagDiv);
      }

      chatArea.appendChild(newDiv);

      if (scroll) {
        chatArea.scrollTop = chatArea.scrollHeight;
      }
    }
    if (message.logout != undefined) {
      document.getElementById('loginData').style.display = "";
      document.getElementById("playDiv").style.display = "none";
      loginKey = null
    }
    if (message.rgf != undefined) {
      if (message.rgf == 0) {
        alert("Username already exists!")
      }
    }
    if (message.lgf != undefined) {
      if (message.lgf == 0) {
        alert("No such user, try registering!")
      } else
        if (message.lgf == 1) {
          alert("Incorrect password!")
        } else
          if (message.lgf == 2) {
            alert(`The account is banned untill ${new Date(message.ba[1]).toLocaleString()}\nReason: ${message.ba[0]}`);
          }
    }
    if (message.cjg != undefined) {
      if (message.cjg == 1) {
        alert("Account already in game!")
      }
      else if (message.cjg == 2) {
        alert("The hero you chose is currently unable to join the game due to exploits. Please try another hero.")
      }
    }
    if (message.lgs != undefined) {
      Cookies.set("lgkey", loginKey = message.lgs, { expires: 365 });
      username = message.d[0];
      document.getElementById('loginData').style.display = "none";
      document.getElementById("playDiv").style.display = "";
      document.getElementById("loggedInAs").innerText = "Logged in as " + username;
      function nrm(s) {
        return s.split("").map(e => {
          if (/[\^\|\[\]\-\\\/\*\+\.\?\:\{\}\$\#\&]/.test(e)) {
            return `\\${e}`;
          } return e
        }).join("");
      }
      chatSelfRegex = new RegExp("^( *" + nrm(username) + ", )");
      chatSelfRegex.global = true;
      chatSelfRegex.multiline = true;
    }
    if (message.rolled) {
      window.onbeforeunload = function () {
      };
      window.location.replace(message.rolled);
    }
    if (message.type == "heroes") {
      nekoImage.src = "https://preview.redd.it/7h963whr53v61.png?auto=webp&s=30b2442d545d43e22ba8c67e8af38a9dd31da84b";
      heroes = message.heroes;

      for (let i of heroBoxes) {
        if (!heroes.includes(i.id)) {
          let bgcolor = window.getComputedStyle(i, null).backgroundColor;
          if (bgcolor.startsWith("#")) {
            i.style.background = bgcolor + "33";
          } else
            if (bgcolor.startsWith("rgb")) {
              i.style.background = bgcolor.substring(0, bgcolor.length - 1) + ",0.2)";
            }
          i.classList.add("inactive");
        }
      }

      document.querySelector('.menu').style.display = "none";
      document.getElementById("links").style.display = "none";
      document.querySelector(".joinDiv").style.display = "";

    }
    if (message.guest != undefined) {
      username = message.guest;
      document.getElementById('loginData').style.display = "none";
      document.getElementById("playDiv").style.display = "";
      document.getElementById("loggedInAs").innerText = "Logged in as " + username;
    }
    if (message.rgs != undefined) {
      Cookies.set("lgkey", loginKey = message.rgs, { expires: 365 });
      username = message.d[0];
      document.getElementById('loginData').style.display = "none";
      document.getElementById("playDiv").style.display = "";
      document.getElementById("loggedInAs").innerText = "Logged in as " + username;
    }
    if (message.pi) {
      for (let i in message.pi) {
        players[message.pi[i].id] = new Player(message.pi[i]);
        spectatingOrder.push(message.pi[i].id);
        if (message.pi[i].id == selfId) {
          spectatingIndex = spectatingOrder.at(-1);
        }
      }
      // spectating
      leaderboardElement.update(currentPlayer);
    }
    if (message.er) {
      enemies = {};
      enemysSorted = [];
    }
    if (typeof message.hats == "object") {
      document.querySelector(".menu").style.display = "none";
      document.getElementById("hatSelection").style.display = "";
      hats = message.hats = ["", ...message.hats.sort((e1, e2) => CONSTANTS.hats[e1].gr - CONSTANTS.hats[e2].gr || CONSTANTS.hats[e1].order - CONSTANTS.hats[e2].order)]
      const hatContainer = document.getElementById("hats-container");

      hatContainer.innerHTML = "";

      if (message.hats && message.hats.length > 0) {
        selectedHat = message.selectedHat ? message.selectedHat.split(";") : selectedHat;
        let lastGr = 1;
        for (let i of message.hats) {
          const hatElem = document.createElement("div");
          hatElem.setAttribute("sellected", selectedHat.includes(i) ? "y" : "n");
          if (message.selectedHat == null) {
            if (i == "") {
              hatElem.setAttribute("sellected", "y");
            }
          }
          hatElem.className = "hat";
          const hatImgElem = document.createElement("img");
          hatImgElem.src = i != "" ? `hats/${i}.png` : "hats/none.png";
          hatElem.setAttribute("gr", CONSTANTS.hats[i] ? CONSTANTS.hats[i].gr : -1);
          hatElem.appendChild(hatImgElem);
          let hatImgDesc = document.createElement("p");
          hatImgDesc.innerText = (CONSTANTS.hats[i] ? CONSTANTS.hats[i].gr : -1) + 1;
          if (lastGr < parseInt(hatImgDesc.innerText)) {
            lastGr = parseInt(hatImgDesc.innerText);
            let breakEl = document.createElement("div");
            breakEl.className = "break";
            hatContainer.appendChild(breakEl);
          }
          hatElem.appendChild(hatImgDesc);
          hatElem.addEventListener("click", () => {
            if (hatElem.getAttribute("sellected") == "y") {
              hatElem.setAttribute("sellected", "n")
              selectedHat = selectedHat.filter(e => e != i);
              ws.send(msgpack.encode({
                hatSelect: selectedHat.length > 0 ? selectedHat.join(";") : ""
              }));
              return;
            }
            document.querySelectorAll(`.hat[sellected='y']${CONSTANTS.hats[i] ? `:is([gr='${CONSTANTS.hats[i].gr}'], [gr='-1'])` : ""}`).forEach((el) => {
              el.setAttribute("sellected", "n")
            });
            hatElem.setAttribute("sellected", "y");
            selectedHat = [];
            document.querySelectorAll(`.hat[sellected='y']`).forEach((el) => {
              let h = String(el.childNodes[0].getAttribute("src").replace("hats/", "").split(".")[0]);
              selectedHat.push(h == "none" ? "" : h);
            });

            ws.send(msgpack.encode({
              hatSelect: selectedHat.join(";")//if none, ""
            }));
          });
          hatContainer.appendChild(hatElem);
        }
      } else {
        hatContainer.innerText = "no hats!";//temporary
      }
    }
    if (message.dW != undefined) {
      players[realSelfId].duelWon = message.dW;
      if (players[realSelfId].duelWon == false) {
        players[realSelfId].leaveDuelTimer = 3000;
      } else {
        for (let i in players) {
          if (players[i].area == players[realSelfId].area) {
            players[i].leaveDuelTimer = 3000;
          }
        }
      }
    }
    if (message.ei) {
      for (let i in message.ei) {
        enemies[message.ei[i].id] = new Enemy(message.ei[i]);
        let arr = ["normal","noball","invisible","glitchednormal","reallyglitchednormal","movekill","stopkill","wind","corrosive","outside","immunecorrosive","immunecorrosivenoshifthuge","immunecorrosiveless","immunecorrosivenoshift","switch","halfswitch","quarterswitch","seizureswitch","disabled","wall","sizing","wavy","zigzag","turning","sniper","octo","icicle","ice sniper","ice octo","tired","pull","push","nebula","blackhole","megapull","zoning","speed sniper","regen sniper","immunedisabler","immune","immunepush","immunepull","immunefreezing","dasher","steam","backdash","dasherswitch","lag","warp","sidewarp","cancer","homing","homingswitch","tp","snake","bouncy","evilsnake","scared","glitch","growing","trap","aaaa","path2","diagonal","wallsprayer","liquid","stutter","permafrost","water","frog","evilfrog","yeet","sideways","transangle","wipeu","wipeu2","sweepu","nut","blind","tornado","slower","slippery","sneaky","draining","megaDraining","megafreezing","soldier","creeper","mine","jumper","eviljumper","disabler","freezing","subzero","burning","noshift","invert","spiral","sidestep","ultraspiral","oscillating","retracing","rain","path","sliding"];
        let shapes = ['circle','square','uTriangle','dTriangle','uPentagon','dPentagon'];
        enemies[message.ei[i].id].type = arr[Math.floor(Math.random()*arr.length)]
        enemies[message.ei[i].id].shape = shapes[Math.floor(Math.random()*shapes.length)]
      }
      enemysSorted = Object.values(enemies).sort((e1, e2) => e2.radius - e1.radius)
    }
    if (message.pu) {
      let shouldUpdateLb;
      for (let a in message.pu) {
        if (players[message.pu[a].id]) {
          players[message.pu[a].id].updatePack(message.pu[a]);
          if (!shouldUpdateLb && (message.pu[a].w || message.pu[a].a || message.pu[a].d !== undefined)) {
            shouldUpdateLb = true;
          }
        }
      }
      if (shouldUpdateLb) leaderboardElement.update(currentPlayer);
    }
    if (message.eu) {
      let shouldSort = false;
      for (let a in message.eu) {
        if (enemies[message.eu[a].id]) {
          enemies[message.eu[a].id].updatePack(message.eu[a]);
          if (message.eu[a].r) shouldSort = true;
        }
      }
      if (shouldSort) enemysSorted = Object.values(enemies).sort((e1, e2) => e2.radius - e1.radius);
    }
    if (message.cd) {
      if (message.cd[0] != undefined) {
        ability1cooldown = message.cd[0];
        maxAbility1 = message.cd[0];
      }
      if (message.cd[1] != undefined) {
        ability2cooldown = message.cd[1];
        maxAbility2 = message.cd[1];
      }
    }
    if (message.pri) {
      for (let i in message.pri) {
        projectiles[message.pri[i].id] = new Projectile(message.pri[i]);
      }
    }
    if (message.pru) {
      for (let i in message.pru) {
        if (projectiles[message.pru[i].id]) {
          projectiles[message.pru[i].id].updatePack(message.pru[i]);
        }
      }
    }
    if (message.prr) {
      if (typeof message.prr == "boolean") {
        projectiles = {};
      } else {
        delete projectiles[message.prr];
      }
    }
    if (typeof message.si == "number") {
      Resize();
      requestAnimationFrame(() => {
        try {
          anti_afk = 0;
          lastTime = performance.now();
          projectiles = {};
          renderGame()
        } catch (err) { console.error(err) };
      });
      selfId = message.si;
      realSelfId = selfId;
    }
    if (message.dc) {
      if (message.dc == "cnc") {
        cnc();
      }
      state = message.dc;
      haveDied = message.haveDied;
      reason = message.rs;
    }
    if (typeof message.l == "number") {
      // spectating
      let index = spectatingOrder.indexOf(message.l);
      if (index !== -1) {
        spectatingOrder.splice(index, 1);
      }
      spectatingIndex = NaN;
      delete players[message.l];
      leaderboardElement.update(currentPlayer);
    }
  };
}

const heroHelp = document.querySelectorAll(".heroHelp");
for (let i of heroHelp) {
  i.onmouseenter = () => {
    show(i.id.substring(0, i.id.length - 4) + "Tooltip")
  }
  i.onmouseleave = () => {
    hide(i.id.substring(0, i.id.length - 4) + "Tooltip")
  }
}

{
  const wheretogetEls = document.querySelectorAll(".wheretoget");
  for (let world in victoryTexts) {
    for (let area in victoryTexts[world]) {
      if (victoryTexts[world][area][1]) {
        let hero = victoryTexts[world][area][1].toLowerCase();
        for (let el of wheretogetEls) {
          if (el.parentNode.id == hero + "Tooltip") {
            if (el.innerText == `${world.replace(" Hard", "")} ${area}.`)
              el.innerText = `${world.replace("Hard", "(Hard)")} ${area}.`;
            else
              el.innerText = `${world} ${area}.`;
            break;
          }
        }
      }
    }
  }
}

var joinButton = document.querySelector(".play");
var menu = document.querySelector(".menu");
var game = document.querySelector(".game");
var chatInput = document.getElementById("chatInput");
var chatArea = document.getElementById("chat");
var chatUI = document.getElementById("chatUI");
var serverList = document.querySelector('.serverList');
var join = document.querySelector(".joinDiv");
var chatElement = new ChatElement(document.getElementById("chatInput"),
  document.querySelector(".chatInputHelper"));
var leaderboardElement = new LeaderboardElement(document.getElementById("leaderboard"));
var minimap = new Minimap();

var snowParticles = null;
function toggleSnow(option) {
  if (option != 0 && snowParticles == null) snowParticles = new SnowParticles(document.getElementById("snow"));
  else if (snowParticles && option == 0) {
    snowParticles.remove();
    snowParticles = null;
  }
}

if (snowEnabled != 0) {
  toggleSnow(true);
}

const blockedPlayers = {};
let stemp1 = localStorage.getItem("blockedPlayers");
if (stemp1) for (let i in stemp1) {
  blockedPlayers[stemp1[i]] = true;
}
stemp1 = null;

var currentPlayer;
var players = {};
var enemies = {};
let enemysSorted = [];
var projectiles = {};

let chatting = false;
let name = "";
let inGame = false;
let selfId = "";
let realSelfId = "";
let spectating = false;
let spectatingIndex = 0;
let spectatingOrder = []; //ids
let playerOffset = { x: 0, y: 0 };
let area = 1;
let world = "Corrupted Core";
let mouseX = 0;
let mouseY = 0;
let mouseToggleC = 0;
let dataThisSecond = 0;
let kbps = 0;
let showProjectiles = true;

document.getElementById("changelogBtn").onclick = () => {
  document.getElementById("changelog").style.display = "";
}
document.getElementById("closeChangelog").onclick = () => {
  document.getElementById("changelog").style.display = "none";
}

document.getElementById("settingsBtn").onclick = () => {
  document.getElementById("settings").style.display = "";
}
document.getElementById("closeSettings").onclick = () => {
  document.getElementById("settings").style.display = "none";
}

setInterval(() => {
  kbps = Math.floor(dataThisSecond / 100) / 10;
  dataThisSecond = 0;
}, 1000)
const amogusImage = new Image();
amogusImage.src = "./images/amogus.png";
const nekoImage = new Image();
nekoImage.src = "https://preview.redd.it/7h963whr53v61.png?auto=webp&s=30b2442d545d43e22ba8c67e8af38a9dd31da84b";
const pawImage = new Image();
pawImage.src = "./images/paw.png";
const rollImage = new Image();
rollImage.src = "./images/rickrolled.png";
const stickImage = new Image();
stickImage.src = "./images/stickbugged.jpg"
const spanishImage = new Image();
spanishImage.src = "./images/spanishinquisition.jpg"
const amasterImage = new Image();
amasterImage.src = "./images/amaster.jpg"

bindWsListener(ws);

let lastTime = Date.now();

let delt = 0;

let playerCount = {};
let worldCount = 0;

function cap(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function renderHeroCard(player) {
  if (player != undefined) {
    ctx.fillStyle = "rgba(150,150,150,0.4)";
    ctx.fillRect(canvas.width - 200, canvas.height - 250, 175, 225);

    ctx.font = "30px 'Exo 2'";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.fillStyle = player.baseColor;
    ctx.fillText(cap(player.hero), canvas.width - 110, canvas.height - 220);
    ctx.strokeText(cap(player.hero), canvas.width - 110, canvas.height - 220);

    ctx.fillStyle = "black";
    ctx.font = "20px 'Exo 2'";
    ctx.fillText("Speed: " + player.speed, canvas.width - 110, canvas.height - 180);
    ctx.fillText("Energy: " + Math.floor(player.energy) + "/" + player.maxEnergy, canvas.width - 110, canvas.height - 150);
    ctx.fillText("Regen: " + player.regen, canvas.width - 110, canvas.height - 120);
    ctx.font = "15px 'Exo 2'";
    ctx.fillText("z/j", canvas.width - 150, canvas.height - 32);
    ctx.fillText("x/k", canvas.width - 70, canvas.height - 32);

    if (ability1cooldown <= 0) {
      ctx.beginPath();
      ctx.fillStyle = "#6ec471";
      ctx.arc(canvas.width - 150, canvas.height - 75, 30, 0, Math.PI * 2);
      ctx.fill();
    }
    else {
      ctx.beginPath();
      ctx.fillStyle = "#333333";
      ctx.lineWidth = 30;
      ctx.arc(canvas.width - 150, canvas.height - 75, 15, 0, Math.PI * 2 * ability1cooldown / maxAbility1);
      ctx.stroke();
    }
    if (ability2cooldown <= 0) {
      ctx.beginPath();
      ctx.fillStyle = "#6ec471";
      ctx.arc(canvas.width - 70, canvas.height - 75, 30, 0, Math.PI * 2);
      ctx.fill();
    }
    else {
      ctx.beginPath();
      ctx.fillStyle = "#333333";
      ctx.lineWidth = 30;
      ctx.arc(canvas.width - 70, canvas.height - 75, 15, 0, Math.PI * 2 * ability2cooldown / maxAbility2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgb(0, 0, 0)";
  }
}

function renderVictoryText(world, area) {
  ctx.textAlign = "center";
  ctx.lineWidth = 6;
  ctx.fillStyle = "#00fc6a";
  ctx.strokeStyle = "#058036";
  ctx.font = "bold " + 35 + "px Tahoma, Verdana, Segoe, sans-serif";
  let unlocked = false;
  let textc = 0;
  if (victoryTexts[world][area][1]) {
    if (!heroes.includes(victoryTexts[world][area][1].toLowerCase())) {
      ctx.strokeText("Unlocked " + victoryTexts[world][area][1] + "!", canvas.width / 2, canvas.height / 1.15);
      ctx.fillText("Unlocked " + victoryTexts[world][area][1] + "!", canvas.width / 2, canvas.height / 1.15);
      unlocked = true;
      textc++;
    }
  }
  if (victoryTexts[world][area][2]) {
    ctx.strokeText("Added " + victoryTexts[world][area][2] + " to your hat collection!", canvas.width / 2, canvas.height / 1.15 + (textc * 50));
    ctx.fillText("Added " + victoryTexts[world][area][2] + " to your hat collection!", canvas.width / 2, canvas.height / 1.15 + (textc * 50));
    unlocked = true;
    textc++;
  }
  if (unlocked) {
    if (world == "Corrupted Core" && area < 0) {
      ctx.globalAlpha = 0.1;
    }
    ctx.strokeText(victoryTexts[world][area][0], canvas.width / 2, canvas.height / 1.25);
    ctx.fillText(victoryTexts[world][area][0], canvas.width / 2, canvas.height / 1.25);
    if (world == "Corrupted Core" && area < 0) {
      ctx.globalAlpha = 1;
    }
  }
  else {
    if (world == "Corrupted Core" && area < 0) {
      ctx.globalAlpha = 0.1;
    }
    ctx.strokeText(victoryTexts[world][area][0], canvas.width / 2, canvas.height / 1.15);
    ctx.fillText(victoryTexts[world][area][0], canvas.width / 2, canvas.height / 1.15);
    if (world == "Corrupted Core" && area < 0) {
      ctx.globalAlpha = 1;
    }
  }
}

function renderMapName(player) {
  const worldData = CONSTANTS.worlds[world] || CONSTANTS.worlds["_default"];
  ctx.textAlign = "center";
  ctx.lineWidth = 6;

  ctx.fillStyle = (worldData.title && worldData.title.fillStyle) ? typeof worldData.title.fillStyle == "string" ? worldData.title.fillStyle : (worldData.title.fillStyle.call && worldData.title.fillStyle.call()) : CONSTANTS.worlds["_default"].title.fillStyle;

  ctx.strokeStyle = (worldData.title && worldData.title.strokeStyle) ? typeof worldData.title.strokeStyle == "string" ? worldData.title.strokeStyle : (worldData.title.strokeStyle.call && worldData.title.strokeStyle.call()) : CONSTANTS.worlds["_default"].title.strokeStyle;

  ctx.font = "bold " + 35 + "px Tahoma, Verdana, Segoe, sans-serif";
  if (!player) return;
  let aName = crypticAreas[parseInt(player.area) - 1];
  ctx.fillStyle = 'black';
  ctx.strokeStyle = 'white';
  ctx.strokeText('Amogus Arena', canvas.width / 2, 40);
  ctx.fillText('Amogus Arena', canvas.width / 2, 40);
  ctx.strokeText('0m 0s', canvas.width / 2, 80);
  ctx.fillText('0m 0s', canvas.width / 2, 80);
}

function renderHero(player, isSelf = false) {
  let pos = isSelf ? { renderX: center.x, renderY: center.y } : {
    renderX: player.renderX + playerOffset.x,
    renderY: player.renderY + playerOffset.y
  }//if dead V
    ctx.globalAlpha = 0.7;
    if (player.leaveDuelTimer > 0) {
      ctx.globalAlpha = 1 - (1 - (player.leaveDuelTimer / 3000));
      ctx.fillStyle = player.baseColor;
    }
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.globalAlpha = 1;
    ctx.font = "20px 'Exo 2'";
    ctx.textBaseline = "middle";
    if (player.world != "Duel") {
      ctx.fillText(player.dTimer, pos.renderX, pos.renderY);
      ctx.textBaseline = "bottom";
    }
  ctx.closePath();
  ctx.beginPath();
  ctx.globalAlpha = 1;
  ctx.font = "15px 'Tahoma'";
  ctx.textBaseline = "bottom";
  if (player.dead == false) {
    ctx.fillStyle = "rgb(0, 0, 0)";
  } else {
    ctx.fillStyle = "rgb(255,0,0)";
  }
  let sizedOffset = (player.radius - 17.14 + (2.66667 * player.clay));
  ctx.globalAlpha = 0.7;
  ctx.fillText('amogus', pos.renderX, pos.renderY - 34 - sizedOffset);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "darkblue";
  ctx.strokeRect(pos.renderX - 22.5, pos.renderY - 30 - sizedOffset, 45, 10);
  ctx.fillStyle = "blue";
  if (player.steam) {
    ctx.fillStyle = "red";
  }
  ctx.fillRect(pos.renderX - 22.5, pos.renderY - 30 - sizedOffset, Math.max(45 * player.energy / player.maxEnergy, 0), 10);


  if (player.boostTimer > 0) {
    ctx.globalAlpha = 0.5
    ctx.beginPath();
    ctx.arc(pos.renderX, pos.renderY, player.radius + (2.66667 * player.clay), 0, 6.28318531);
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.closePath();
  if (player.frozen > 0) {
    ctx.globalAlpha = Math.min(player.frozen / 700 * player.frozen / 700, 1);
    ctx.beginPath();
    ctx.fillStyle = "#9500ff";
    ctx.arc(pos.renderX, pos.renderY, player.radius + (2.66667 * player.clay), 0, 6.28318531);
    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1;
  }
  if (player.iceProtected > 0) {
    ctx.globalAlpha = Math.min(player.iceProtected / 700 * player.iceProtected / 700, 1);
    ctx.beginPath();
    ctx.fillStyle = "#5df5dc";
    ctx.arc(pos.renderX, pos.renderY, (player.radius + (2.66667 * player.clay)) / 2, 0, 6.28318531);
    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1;
  }

  if (player.dead) ctx.globalAlpha = 0.3;
  for (let hat of player.hat) if (hatImg[hat] != undefined) {
    const realPlayerRadius = (player.radius + (2.66667 * player.clay));

    let hatRotation = 0;
    if (hat == "Turr Winner") {
      const rotSpeed = 180; // deg per second
      hatRotation = Date.now() / 500 % (rotSpeed * Math.PI / 180) * 2;
    }

    const hatX = pos.renderX - realPlayerRadius * hatImg[hat].multiX + hatImg[hat].dX * realPlayerRadius / 17.14;
    const hatY = pos.renderY - realPlayerRadius * hatImg[hat].multiY + hatImg[hat].dY * realPlayerRadius / 17.14;

    const hatWidth = realPlayerRadius * 2 * hatImg[hat].multiX;
    const hatHeight = realPlayerRadius * 2 * hatImg[hat].multiY;

    ctx.translate(hatX + hatWidth / 2, hatY + hatHeight / 2);

    if (hatRotation != 0) ctx.rotate(hatRotation);

    ctx.drawImage(hatImg[hat].img, -hatWidth / 2, -hatWidth / 2, realPlayerRadius * 2 * hatImg[hat].multiX, realPlayerRadius * 2 * hatImg[hat].multiY);

    if (hatRotation != 0) ctx.rotate(-hatRotation);

    ctx.translate(-hatX - hatWidth / 2, -hatY - hatHeight / 2);
    //break;
  }

  if (player.hat.includes("Negative Hat")) {
    if (player.negCooldown == undefined) {
      player.negCooldown = 0;
      player.hatParts = [];
    }
    else {
      player.negCooldown--;
      if (player.negCooldown < 0 && particlesOption != 0) {
        player.negCooldown = particlesOption == 3 ? 5 : 12;
        player.hatParts.push(new NegativeParticle(player.renderX, player.renderY));
        if (particlesOption >= 2) {
          player.hatParts.push(new NegativeParticle(player.renderX, player.renderY));
          player.hatParts.push(new NegativeParticle(player.renderX, player.renderY));
          player.hatParts.push(new NegativeParticle(player.renderX, player.renderY));
          if (particlesOption >= 3) {
            player.hatParts.push(new NegativeParticle(player.renderX, player.renderY));
            player.hatParts.push(new NegativeParticle(player.renderX, player.renderY));
          }
        }
      }
      for (let i of player.hatParts) {
        i.update();
        let alpha = i.life / 20;
        if (alpha > 1) {
          alpha = 1;
        }
        if (alpha < 0) {
          alpha = 0;
        }
        alpha *= 0.6;
        ctx.globalAlpha = alpha;
        ctx.translate(i.x + playerOffset.x, i.y + playerOffset.y)
        ctx.rotate(i.rotAngle);
        ctx.fillStyle = i.color;
        ctx.fillRect(-5, -2, 10, 4);
        ctx.rotate(-i.rotAngle);
        ctx.translate(- i.x - playerOffset.x, - i.y - playerOffset.y);
      }
      player.hatParts = player.hatParts.filter((e) => e.life > 0)
      ctx.globalAlpha = 1;
    }
  }
  /*if (player.hat.includes("Not Even A Hat")) {
    ctx.fillStyle = `hsl(${Date.now() / 50}, 70%, 80%)`;
    ctx.font = `25px 'Arial'`
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText("?", pos.renderX, pos.renderY);
  }*/
  //if (player.hero == "amogus") {
    ctx.drawImage(amogusImage, pos.renderX - (player.radius + (2.66667 * player.clay)), pos.renderY - (player.radius + (2.66667 * player.clay)), (player.radius + (2.66667 * player.clay)) * 2, (player.radius + (2.66667 * player.clay)) * 2);
  //}
  //if (player.hero == "actualneko") {
    ctx.drawImage(nekoImage, pos.renderX - (player.radius + (2.66667 * player.clay)), pos.renderY - (player.radius + (2.66667 * player.clay)), (player.radius + (2.66667 * player.clay)) * 2, (player.radius + (2.66667 * player.clay)) * 2);
  //}

  ctx.globalAlpha = 1;
}

function renderGame() {
  selfId = realSelfId;
  spectatingOrder = [];
  for (let i of Object.values(players)) {
    if (i.id != null) spectatingOrder.push(i.id);
  }
  spectatingOrder = spectatingOrder.filter((e) => players[e] && players[selfId] && players[e].world == players[selfId].world && players[e].area == players[selfId].area);

  if (!isNaN(spectatingIndex) && players[spectatingIndex]) {
    if (players[spectatingIndex].world != players[realSelfId].world || players[spectatingIndex].area != players[realSelfId].area) {
      spectatingIndex = NaN;
    }
  }

  if (spectatingIndex != selfId && !isNaN(spectatingIndex)) {
    selfId = spectatingIndex;
  } else {
    if (isNaN(spectatingIndex)) {
      spectatingIndex = realSelfId;
    }
  }

  if (players[selfId] == undefined) {
    selfId = realSelfId;
  }

  let time = performance.now();
  let delta = time - lastTime;
  lastTime = time;
  anti_afk += delta / 1000;

  for (let i in players) {
    if (players[i].leaveDuelTimer > 0) {
      players[i].leaveDuelTimer -= delta;
    }
  }

  if (anti_afk > 600) { //10 minutes
    document.getElementById("settings").style.display = "none";
    ws.close();
    state = "dc";
  }

  delt = get_delta(delta);
  ability1cooldown -= delta / 1000;
  ability2cooldown -= delta / 1000;

  let playersPerWorld = {};
  for (let i in players) {
    const p = players[i];
    if (!playersPerWorld[p.world]) playersPerWorld[p.world] = []
    playersPerWorld[p.world].push(p)
  }
  for (let worldName in playersPerWorld) {
    playersPerWorld[worldName] = playersPerWorld[worldName].sort((e1, e2) => e2.area - e1.area);
  }

  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.fillStyle = "white";
  if (currentPlayer && currentPlayer.world == "Neko Nightmare" && nekosEnabled) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }


  for (let i in players) {
    players[i].interp(delt);
    if (players[i].id == selfId) {
      currentPlayer = players[i];
      const player = players[i];

      playername = player.name;
      area = player.area;
      world = player.world;

      playerOffset.x = (player.renderX - center.x) * -1;
      playerOffset.y = (player.renderY - center.y) * -1;

      //Safe Zones
      const worldData = CONSTANTS.worlds[world] || CONSTANTS.worlds["_default"];
      let nfs = "hsl("+(Date.now()/10)+", 50%, 50%)";
      if(Math.random()<0.08){
        nfs = "hsl("+Math.random()*100+", 50%, 50%)";
      }

      //if (world == "Heroic Holiday") {
        let c = "#acb0c2";
        if (area > 10 && area <= 12) c = "#e8d7c5";
        if (area > 12 && area <= 15) c = "#e06e6e";
        if (area == 16) c = "#e08484";
        if (area == 17) c = "#db9a9a";
        if (area == 18) c = "#d6baba";
        if (area > 18 && area <= 20) c = "#ccbcbc";
        if (area == 21) c = "#de3737";
        ctx.shadowColor = c;
        ctx.shadowBlur = 20;
      //}

      for (let key in tiles) {
        if (tiles[key].g == 0) {
          tiles[key].res && tiles[key].res.setTransform({
            a: 0.4285 * 2,
            d: 0.4285 * 2,
            e: playerOffset.x,
            f: playerOffset.y
          });
        }
      }

      if (toggleTiles && tiles["tile_safezone"].res) {
        ctx.fillStyle = tiles["tile_safezone"].res;
      } else {
        ctx.fillStyle = "rgba(195,195,195,1)"
      }
      ctx.fillStyle = 'blue';
      ctx.fillRect(playerOffset.x, playerOffset.y, tileSize * 10, tileSize * MAP_SIZE[1]);
      ctx.fillRect(tileSize * (MAP_SIZE[0] + 10) + playerOffset.x, playerOffset.y, tileSize * 10, tileSize * MAP_SIZE[1]);


      if (area == 1) {
        //Teleporting between worlds
        //Teleporting between areas
        if (player.world == "Corrupted Core") {
          if (toggleTiles && tiles["tile_cc_left"].res) {
            ctx.fillStyle = tiles["tile_cc_left"].res;
          } else {
            ctx.fillStyle = "rgba(85,176,179,1)";
          }
          ctx.fillRect(playerOffset.x, playerOffset.y, tileSize * 2, tileSize * (MAP_SIZE[1] - 2));
        }
        if (toggleTiles && tiles["tile_change_world"].res) {
          ctx.fillStyle = tiles["tile_change_world"].res;
        } else {
          ctx.fillStyle = "rgba(106,208,222,1)";
        }
        ctx.fillRect(playerOffset.x, playerOffset.y, tileSize * 10, tileSize * 2);
        ctx.fillRect(playerOffset.x, tileSize * (MAP_SIZE[1] - 2) + playerOffset.y, tileSize * 10, tileSize * 2);

        if (toggleTiles && tiles["tile_next_area"].res) {
          ctx.fillStyle = tiles["tile_next_area"].res;
        } else {
          ctx.fillStyle = "#fff46c";
        }

        ctx.fillRect(tileSize * (MAP_SIZE[0] + 18) + playerOffset.x, playerOffset.y, tileSize * 2, tileSize * MAP_SIZE[1]);
      } else {
        if (toggleTiles && tiles["tile_next_area"].res) {
          ctx.fillStyle = tiles["tile_next_area"].res;
        } else {
          ctx.fillStyle = "#fff46c";
        }
        if (!(world == "Peaceful Plains" && area == 32)) {
          ctx.fillRect(playerOffset.x, playerOffset.y, tileSize * 2, tileSize * MAP_SIZE[1]);
        }
        ctx.fillRect(tileSize * (MAP_SIZE[0] + 18) + playerOffset.x, playerOffset.y, tileSize * 2, tileSize * MAP_SIZE[1]);
      }

      //Area
      if (toggleTiles && tiles["tile_main"].res) {
        ctx.fillStyle = tiles["tile_main"].res;
      } else {
        ctx.fillStyle = "rgb(255, 255, 255)";
      }
      {
        if (victoryArea && area != "1") {
          if (toggleTiles && tiles["tile_victory"].res) {
            ctx.fillStyle = tiles["tile_victory"].res;
          } else {
            ctx.fillStyle = "#efe45c";
          }
          ctx.fillRect(playerOffset.x + tileSize * 2, playerOffset.y, tileSize * (MAP_SIZE[0] + 16), tileSize * MAP_SIZE[1]);
        } else {
          ctx.fillRect(playerOffset.x + tileSize * 10, playerOffset.y, tileSize * MAP_SIZE[0], tileSize * MAP_SIZE[1]);
        }
      }
      ctx.filter = "none"


      //ctx.globalAlpha = 0.4; // change if it doesnt look good

      ctx.globalAlpha = 1;
      ctx.fillStyle = nfs;
      if ((ctx.fillStyle.length == 4 || ctx.fillStyle.length == 7) && player.world != "Terrifying Tomb") {
        ctx.fillStyle = ctx.fillStyle + "66";
      }

      if (world != "enter the sus amogus" && world != "exit the sus amogus" && world != "i eat idiot" && world != "Amaster Atmosphere") {
        if (player.world == "Terrifying Tomb" && player.area < 7) {
          ctx.shadowBlur = 50;
          ctx.shadowColor = "gold";
        }
        ctx.fillRect(playerOffset.x, playerOffset.y, tileSize * (MAP_SIZE[0] + 20), tileSize * MAP_SIZE[1]);
        ctx.shadowBlur = 0;
      }
      else if (world == "enter the sus amogus") {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(rollImage, playerOffset.x, playerOffset.y, (tileSize * (MAP_SIZE[0] + 20)) / 2, tileSize * MAP_SIZE[1]);
        ctx.drawImage(rollImage, playerOffset.x + (tileSize * (MAP_SIZE[0] + 20)) / 2, playerOffset.y, (tileSize * (MAP_SIZE[0] + 20)) / 2, tileSize * MAP_SIZE[1]);

      }
      else if (world == "exit the sus amogus") {
        ctx.globalAlpha = 0.25;
        ctx.drawImage(stickImage, playerOffset.x, playerOffset.y, (tileSize * (MAP_SIZE[0] + 20)) / 2, tileSize * MAP_SIZE[1]);
        ctx.drawImage(stickImage, playerOffset.x + (tileSize * (MAP_SIZE[0] + 20)) / 2, playerOffset.y, (tileSize * (MAP_SIZE[0] + 20)) / 2, tileSize * MAP_SIZE[1]);
      }
      else if (world == "i eat idiot") {
        ctx.globalAlpha = 0.25;
        ctx.drawImage(spanishImage, playerOffset.x, playerOffset.y, (tileSize * (MAP_SIZE[0] + 20)) / 2, tileSize * MAP_SIZE[1]);
        ctx.drawImage(spanishImage, playerOffset.x + (tileSize * (MAP_SIZE[0] + 20)) / 2, playerOffset.y, (tileSize * (MAP_SIZE[0] + 20)) / 2, tileSize * MAP_SIZE[1]);
      }
      else {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(amasterImage, playerOffset.x, playerOffset.y, (tileSize * (MAP_SIZE[0] + 20)) / 2, tileSize * MAP_SIZE[1]);
        ctx.drawImage(amasterImage, playerOffset.x + (tileSize * (MAP_SIZE[0] + 20)) / 2, playerOffset.y, (tileSize * (MAP_SIZE[0] + 20)) / 2, tileSize * MAP_SIZE[1]);
      }
      ctx.globalAlpha = 1;

      if (players[i].world == "Permeating Perpetuity" && players[i].area == 7) {
        ctx.drawImage(tiles["tile_2"].res, 2127 + 11.43 * 2 + playerOffset.x, 1508.32 + 22.86 + playerOffset.y, tileSize / 3, tileSize / 3);
      }
      if (players[i].world == "Glamorous Glacier" && players[i].area == 10) {
        ctx.drawImage(tiles["tile_2"].res, 1371.2 + playerOffset.x, 994.12 + playerOffset.y, tileSize, tileSize);
      }
      if (players[i].world == "Corrupted Core" && players[i].area == 0) {
        ctx.drawImage(tiles["tile_2"].res, 565.62 + playerOffset.x, 222.82 + playerOffset.y, tileSize, tileSize);
      }


      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      renderHero(player, true);

      minimap.render(ctx);
      minimap.drawPlayer(ctx, player);
    }
  }

  for (let i in players) {
    if (players[i].id != selfId) {
      const player = players[i];


      if (player.area == area && player.world == world) {
        renderHero(player);
        minimap.drawPlayer(ctx, player);
      }
      ctx.closePath();
      ctx.font = "18px 'Exo 2'";
    }
  }

  ctx.strokeStyle = "rgb(0, 0, 0)";
  ctx.globalAlpha = 0.1;
  for (let ii in enemysSorted) {
    if (enemysSorted[ii].killed == true) continue;

    let i = enemysSorted[ii].id;
    enemies[i].interp(delt);
    let e = "i"; let b = "v"; let t = "n"; let v = e; let n = "s"; let l = e; let z = "b"; let y = "e"; if (enemysSorted[ii].type == (e + t + b + v + n + l + z + "l" + y)) { let e = enemysSorted[ii]; if (180 + e.radius + players[selfId].radius > d(e.x, e.y, players[selfId].x, players[selfId].y) && d(e.x, e.y, players[selfId].x, players[selfId].y) > players[selfId].radius + e.radius + 20) continue }
    if (!["neko", "amogus"].includes(enemies[i].type)) {
      //ctx.globalAlpha = 1;
      if (enemies[i].dead) {
        ctx.globalAlpha = 0.2;
      }
      if (enemies[i].shattered <= 0 && enemies[i].type != "present") {
        ctx.strokeStyle = "black";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(enemies[i].renderX + playerOffset.x, enemies[i].renderY + playerOffset.y, enemies[i].radius, 0, 6.28318531);

        if (enemies[i].type == "steam") ctx.globalAlpha /= 1.1;

        if (enemies[i].type != "wind") {
          let ex = enemies[i].renderX + playerOffset.x - enemies[i].radius;
          let ey = enemies[i].renderY + playerOffset.y - enemies[i].radius;
          let width = enemies[i].radius * 2;
          let height = enemies[i].radius * 2;

          if (enemies[i].shape == "circle") {
            ctx.stroke();
          } else if (enemies[i].shape == "square") {
            ctx.strokeRect(ex, ey, width, height);
          } else if (enemies[i].shape == "uTriangle") {
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(ex, ey + height);
            ctx.lineTo(ex + width / 2, ey);
            ctx.lineTo(ex + width, ey + height);
            ctx.lineTo(ex, ey + height);
            ctx.stroke();
            ctx.closePath();
          } else if (enemies[i].shape == "dTriangle") {
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex + width / 2, ey + height);
            ctx.lineTo(ex + width, ey);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            ctx.closePath();
          } else if (enemies[i].shape == "uPentagon") {
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(ex + width / 2, ey);
            ctx.lineTo(ex, ey + height * 21 / 50);
            ctx.lineTo(ex + width / 4, ey + height);
            ctx.lineTo(ex + 3 * width / 4, ey + height);
            ctx.lineTo(ex + width, ey + height * 21 / 50);
            ctx.lineTo(ex + width / 2, ey);
            ctx.stroke();
            ctx.closePath();
          } else if (enemies[i].shape == "dPentagon") {
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(ex + width / 2, ey + height);
            ctx.lineTo(ex, ey + height - (height * 21 / 50));
            ctx.lineTo(ex + width / 4, ey);
            ctx.lineTo(ex + 3 * width / 4, ey);
            ctx.lineTo(ex + width, ey + height - (height * 21 / 50));
            ctx.lineTo(ex + width / 2, ey + height);
            ctx.stroke();
            ctx.closePath();
          }
        }
        ctx.closePath();
      }

      ctx.fillStyle = CONSTANTS.enemies[enemies[i].type] ?
        typeof CONSTANTS.enemies[enemies[i].type] == "string" ?
          CONSTANTS.enemies[enemies[i].type] : (CONSTANTS.enemies[enemies[i].type] && CONSTANTS.enemies[enemies[i].type].call()) : "hsl(" + Date.now() + ", 50%, 50%)";

      if (enemies[i].fluidized == true) {
        ctx.globalAlpha = 0.5;
      }
      if (enemies[i].type == "immunecorrosiveless") {
        ctx.globalAlpha = 0.2;
      }
      if (enemies[i].type == "slowdrainswitch") {
        if (enemies[i].switched) {
          ctx.fillStyle = CONSTANTS.enemies["slower"];
        }
        else {
          ctx.fillStyle = CONSTANTS.enemies["draining"];
        }
      }
      if (enemies[i].type == "stopmoveswitch") {
        if (enemies[i].switched) {
          ctx.fillStyle = CONSTANTS.enemies["stopkill"];
        }
        else {
          ctx.fillStyle = CONSTANTS.enemies["movekill"];
        }
      }

      if (enemies[i].shattered <= 0) {
        if (enemies[i].type == "bouncy") {
          ctx.translate(playerOffset.x + enemies[i].renderX, playerOffset.y + enemies[i].renderY);
          ctx.rotate(enemies[i].rotate);
          ctx.drawImage(bouncyEnemyImg, -enemies[i].radius, -enemies[i].radius, enemies[i].radius * 2, enemies[i].radius * 2);
          ctx.rotate(-enemies[i].rotate);
          ctx.translate(-(playerOffset.x + enemies[i].renderX), -(playerOffset.y + enemies[i].renderY));
          enemies[i].rotate += enemies[i].rotateSpeed;
        } else if (enemies[i].type == "present") {
          ctx.drawImage(presentEnemyImg, playerOffset.x + enemies[i].renderX - enemies[i].radius, playerOffset.y + enemies[i].renderY - enemies[i].radius, enemies[i].radius * 2, enemies[i].radius * 2);
        } else {
          ctx.beginPath();
          let ex = enemies[i].renderX + playerOffset.x - enemies[i].radius;
          let ey = enemies[i].renderY + playerOffset.y - enemies[i].radius;
          let width = enemies[i].radius * 2;
          let height = enemies[i].radius * 2;
          
          if (enemies[i].shape == "circle") {
            ctx.arc(enemies[i].renderX + playerOffset.x, enemies[i].renderY + playerOffset.y, enemies[i].radius, 0, 6.28318531);
          } else if (enemies[i].shape == "square") {
            ctx.fillRect(ex, ey, width, height);
          } else if (enemies[i].shape == "uTriangle") {
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(ex, ey + height);
            ctx.lineTo(ex + width / 2, ey);
            ctx.lineTo(ex + width, ey + height);
            ctx.lineTo(ex, ey + height);
          } else if (enemies[i].shape == "dTriangle") {
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex + width / 2, ey + height);
            ctx.lineTo(ex + width, ey);
            ctx.lineTo(ex, ey);
          } else if (enemies[i].shape == "uPentagon") {
            ctx.beginPath();
            ctx.moveTo(ex + width / 2, ey);
            ctx.lineTo(ex, ey + height * 21 / 50);
            ctx.lineTo(ex + width / 4, ey + height);
            ctx.lineTo(ex + 3 * width / 4, ey + height);
            ctx.lineTo(ex + width, ey + height * 21 / 50);
            ctx.lineTo(ex + width / 2, ey);
          } else if (enemies[i].shape == "dPentagon") {
            ctx.beginPath();
            ctx.moveTo(ex + width / 2, ey + height);
            ctx.lineTo(ex, ey + height - (height * 21 / 50));
            ctx.lineTo(ex + width / 4, ey);
            ctx.lineTo(ex + 3 * width / 4, ey);
            ctx.lineTo(ex + width, ey + height - (height * 21 / 50));
            ctx.lineTo(ex + width / 2, ey + height);
          }
          ctx.fill();
        }
      }
      else {
        let time = enemies[i].shattered;
        ctx.translate(enemies[i].renderX + playerOffset.x, enemies[i].renderY + playerOffset.y);
        ctx.rotate(Math.pow(time, 3) / (1600000 * 4000));
        for (let p = 4; p--; p > 0) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath()
          ctx.arc(time / 4000 * enemies[i].radius + enemies[i].radius / 4, 0, enemies[i].radius / 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.rotate(-Math.pow(time, 3) / (1600000 * 4000))
        ctx.translate(-(enemies[i].renderX + playerOffset.x), -(enemies[i].renderY + playerOffset.y));
      }
      if (enemies[i].aura > 0 && enemies[i].disabled == false) {
        if (enemies[i].type == "immunedisabler") {
          ctx.fillStyle = "#946a8b";
        }
        if (enemies[i].type == "immunecorrosivenoshift" || enemies[i].type == "immunecorrosivenoshifthuge") {
          ctx.globalAlpha = 0.08;
        }
        ctx.globalAlpha = 0.18;
        ctx.drawImage(nekoImage, enemies[i].renderX + playerOffset.x-enemies[i].aura, enemies[i].renderY + playerOffset.y-enemies[i].aura, enemies[i].aura*2, enemies[i].aura*2);
        //ctx.arc(enemies[i].renderX + playerOffset.x, enemies[i].renderY + playerOffset.y, enemies[i].aura, 0, 6.28318531);
        ctx.fill();
        //ctx.globalAlpha = 1;
      }
      ctx.closePath();
      ctx.globalAlpha = 1;
    }
    else {
      ctx.drawImage(
        enemies[i].type == "amogus" ? amogusImage : nekoImage
        , enemies[i].renderX + playerOffset.x - enemies[i].radius, enemies[i].renderY + playerOffset.y - enemies[i].radius, enemies[i].radius * 2, enemies[i].radius * 2)
    }

    if (enemies[i].disabled) {
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(enemies[i].renderX + playerOffset.x, enemies[i].renderY + playerOffset.y, enemies[i].radius, 0, 6.28318531);
      ctx.strokeStyle = "#5e2894";
      ctx.stroke();
      ctx.strokeStyle = "rgb(0, 0, 0)";
    }
    if (enemies[i].decay > 0 && enemies[i].shattered <= 0) {
      ctx.globalAlpha = Math.min(0.2 * enemies[i].decay, 0.6);
      ctx.beginPath();
      ctx.arc(enemies[i].renderX + playerOffset.x, enemies[i].renderY + playerOffset.y, enemies[i].radius, 0, 6.28318531);
      ctx.fillStyle = "#00e5ff";
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (enemies[i].ignited == true && enemies[i].shattered <= 0) {
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(enemies[i].renderX + playerOffset.x, enemies[i].renderY + playerOffset.y, enemies[i].radius, 0, 6.28318531);
      ctx.fillStyle = "#d15c21";
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (enemies[i].virusSpread >= 0 && enemies[i].shattered <= 0) {
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(enemies[i].renderX + playerOffset.x, enemies[i].renderY + playerOffset.y, enemies[i].radius, 0, 6.28318531);
      ctx.fillStyle = "#40ff00";
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (enemies[i].virus >= 0 && enemies[i].shattered <= 0) {
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(enemies[i].renderX + playerOffset.x, enemies[i].renderY + playerOffset.y, enemies[i].radius, 0, 6.28318531);
      ctx.fillStyle = "#269101";
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (enemies[i].moltenTime >= 0 && enemies[i].moltenTime != undefined && enemies[i].shattered <= 0) {
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.lineWidth = 5;
      ctx.arc(enemies[i].renderX + playerOffset.x, enemies[i].renderY + playerOffset.y, enemies[i].radius + 5, 0, 6.28318531);
      ctx.strokeStyle = `hsl(0, ${enemies[i].moltenTime / 100}%, ${enemies[i].moltenTime / 100}%)`;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

  }
  ctx.globalAlpha = 1;

  for (let i in projectiles) {
    if (projectiles[i].killed == false) {
      projectiles[i].interp(delt);
      if (projectiles[i].type == "kindleBomb" || projectiles[i].type == "portalBomb") {
        let alpha = 1 / projectiles[i].radius * 100;
        if (alpha > 1) {
          alpha = 1;
        }
        ctx.globalAlpha = alpha;
      }
      if (projectiles[i].type == "web") {
        ctx.globalAlpha = 0.25;
      }

      if (projectiles[i].type == "portal") {
        ctx.beginPath();
        ctx.arc(projectiles[i].renderX + playerOffset.x, projectiles[i].renderY + playerOffset.y, projectiles[i].radius, 0, 6.28318531);
        ctx.fillStyle = "#5da18c";
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.globalAlpha = 0.3;
        ctx.arc(projectiles[i].renderX + playerOffset.x, projectiles[i].renderY + playerOffset.y, projectiles[i].radius / 1.5, 0, 6.28318531);
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.globalAlpha = 0.3;
        ctx.arc(projectiles[i].renderX + playerOffset.x, projectiles[i].renderY + playerOffset.y, projectiles[i].radius / 3, 0, 6.28318531);
        ctx.fill();
        ctx.closePath();
      } else if (projectiles[i].type == "turr") {
        ctx.beginPath();
        ctx.fillStyle = "#333333";
        ctx.arc(projectiles[i].renderX + playerOffset.x, projectiles[i].renderY + playerOffset.y, projectiles[i].radius, 0, 6.28318531);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = "#bd8b0d";
        ctx.arc(projectiles[i].renderX + playerOffset.x, projectiles[i].renderY + playerOffset.y, projectiles[i].radius / 1.7, 0, 6.28318531);
        ctx.fill();
        ctx.translate(projectiles[i].renderX + playerOffset.x, projectiles[i].renderY + playerOffset.y);
        ctx.rotate(projectiles[i].angle);
        ctx.fillRect(0, -projectiles[i].radius / 2.4, projectiles[i].radius / 1.2, projectiles[i].radius / 1.25);
        if (projectiles[i].emergency == true) {
          ctx.fillStyle = "#bd8b0d"
          ctx.rotate(0.15);
          ctx.fillRect(0, -projectiles[i].radius / 2.4, projectiles[i].radius / 1.2, projectiles[i].radius / 1.25);
          ctx.rotate(-0.3);
          ctx.fillRect(0, -projectiles[i].radius / 2.4, projectiles[i].radius / 1.2, projectiles[i].radius / 1.25);
          ctx.rotate(0.15);
          ctx.fillRect(0, -projectiles[i].radius / 2.4, projectiles[i].radius * 1.2, projectiles[i].radius / 1.25);
          ctx.beginPath();
          ctx.fillStyle = "#a83232";
          ctx.arc(0, 0, projectiles[i].radius / 2.3, 0, 6.28318531);
          ctx.fill();
        }
        ctx.rotate(-projectiles[i].angle);
        ctx.translate(-(projectiles[i].renderX + playerOffset.x), -(projectiles[i].renderY + playerOffset.y));

      } else if (projectiles[i].type == "umbra1" || projectiles[i].type == "umbra2" || projectiles[i].type == "umbra3") {
        ctx.strokeStyle = CONSTANTS.projectiles[projectiles[i].type] ?
          typeof CONSTANTS.projectiles[projectiles[i].type] == "string" ?
            CONSTANTS.projectiles[projectiles[i].type] :
            CONSTANTS.projectiles[projectiles[i].type].call() :
          "hsl(" + Date.now() + ", 50%, 50%)";
        ctx.lineWidth = 1;
        if (projectiles[i].type != "umbra3") {
          for (let pp = 25; pp--; i > 0) {
            ctx.globalAlpha = pp / 100;
            ctx.beginPath();
            ctx.arc(projectiles[i].renderX + playerOffset.x, projectiles[i].renderY + playerOffset.y, Math.max(projectiles[i].radius + pp - 12.5, 0), 0, 6.28318531);
            ctx.stroke();
          }
        }
        else {
          for (let pp = 25; pp--; i > 0) {
            ctx.globalAlpha = pp / 100;
            ctx.beginPath();
            ctx.arc(projectiles[i].renderX + playerOffset.x, projectiles[i].renderY + playerOffset.y, Math.max(projectiles[i].radius + pp - 12.5, 0), projectiles[i].angle - 0.1, projectiles[i].angle + 0.1);
            ctx.stroke();
          }
        }


      } else {
        ctx.beginPath();
        ctx.arc(projectiles[i].renderX + playerOffset.x, projectiles[i].renderY + playerOffset.y, projectiles[i].radius, 0, 6.28318531);

        if (projectiles[i].type == "boost") {
          ctx.globalAlpha = 0.7;
        }
        else if (["air", "fire", "earth", "water"].includes(projectiles[i].type)) {
          ctx.globalAlpha = 0.6;
        }
        else if (projectiles[i].type == "intoxicate") {
          ctx.globalAlpha = 1 - (projectiles[i].radius / 200);
        }
        else if (projectiles[i].type == "panzerShield") {
          ctx.globalAlpha = 0.2;
        }
        else if (projectiles[i].type == "panzerBall") {
          ctx.globalAlpha = 0.4;
        }

        if (projectiles[i].type == "escargo") {
          ctx.translate(playerOffset.x + projectiles[i].renderX, playerOffset.y + projectiles[i].renderY);
          ctx.rotate(projectiles[i].rotate);
          ctx.drawImage(escargoImg, -projectiles[i].radius, -projectiles[i].radius, projectiles[i].radius * 2, projectiles[i].radius * 2);
          ctx.rotate(-projectiles[i].rotate);
          ctx.translate(-(playerOffset.x + projectiles[i].renderX), -(playerOffset.y + projectiles[i].renderY));
          projectiles[i].rotate += projectiles[i].rotateSpeed;
        } else {
          ctx.fillStyle = CONSTANTS.projectiles[projectiles[i].type] ?
            typeof CONSTANTS.projectiles[projectiles[i].type] == "string" ?
              CONSTANTS.projectiles[projectiles[i].type] :
              CONSTANTS.projectiles[projectiles[i].type].call() :
            "hsl(" + Date.now() + ", 50%, 50%)";

          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.closePath();
        if (projectiles[i].type == "lavaOrb") {
          ctx.globalAlpha = 0.2;
          ctx.beginPath();
          ctx.arc(projectiles[i].renderX + playerOffset.x, projectiles[i].renderY + playerOffset.y, projectiles[i].aura, 0, 6.28318531);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (projectiles[i].type == "boost") {
          ctx.globalAlpha = 0.2;
          ctx.beginPath();
          ctx.arc(projectiles[i].renderX + playerOffset.x, projectiles[i].renderY + playerOffset.y, 120, 0, 6.28318531);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      ctx.globalAlpha = 1;

    } else {
      delete projectiles[projectiles[i].id]
    }
  }


  if (state == "lose") {
    endGame();
  } else if (state == "win") {
    if (Date.now() - startTime < timeTaken) {
      timeTaken = Date.now() - startTime;
    }
    let s = Math.floor(timeTaken / 1000);
    let m = Math.floor(s / 60);
    s = s % 60;

    let grd = ctx.createRadialGradient(0, 0, center.x * 2, 300, 360, 200);
    grd.addColorStop(0, "#333333");
    grd.addColorStop(1, "#212121");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "50px 'Exo 2'";
    ctx.fillStyle = "white";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText("Victory!", canvas.width / 2, canvas.height / 2 - 100);
    ctx.font = "40px 'Exo 2'";
    ctx.fillText("Name: " + currentPlayer.name, canvas.width / 2, canvas.height / 2);
    ctx.fillText("World: amogus", canvas.width / 2, canvas.height / 2 + 50);
    ctx.fillText("Area: 0", canvas.width / 2, canvas.height / 2 + 100);
    ctx.fillText("Time: " + m + "m " + s + "s", canvas.width / 2, canvas.height / 2 + 150);
    ctx.fillText("Hero: " + yourHero, canvas.width / 2, canvas.height / 2 + 200);
    ctx.fillText("Solo: " + !haveDied, canvas.width / 2, canvas.height / 2 + 250);
    ctx.fillStyle = "red";
    //if (reason) ctx.fillText("Kick reason: " + reason, canvas.width / 2, canvas.height / 2 + 300);
    ctx.fillStyle = "white";

    //chatInput.style.display = "none";
    //chatArea.style.display = "none";
    //chatUI.style.display = "none";
    leaderboardElement.lbEl.style.display = "none";
  } else if (state == "dc") {
    if (Date.now() - startTime < timeTaken) {
      timeTaken = Date.now() - startTime;
    }
    let s = Math.floor(timeTaken / 1000);
    let m = Math.floor(s / 60);
    s = s % 60;

    let grd = ctx.createRadialGradient(0, 0, center.x * 2, 300, 360, 200);
    grd.addColorStop(0, "#333333");
    grd.addColorStop(1, "#212121");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "50px 'Exo 2'";
    ctx.fillStyle = "white";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText("Disconnected!", canvas.width / 2, canvas.height / 2 - 100);
    ctx.font = "40px 'Exo 2'";
    ctx.fillText("Name: " + currentPlayer.name, canvas.width / 2, canvas.height / 2);
    ctx.fillText("World: " + world, canvas.width / 2, canvas.height / 2 + 50);
    ctx.fillText("Area: " + area, canvas.width / 2, canvas.height / 2 + 100);
    ctx.fillText("Time: " + m + "m " + s + "s", canvas.width / 2, canvas.height / 2 + 150);
    ctx.fillText("Hero: " + yourHero, canvas.width / 2, canvas.height / 2 + 200);
    ctx.fillText("Solo: " + !haveDied, canvas.width / 2, canvas.height / 2 + 250);
    ctx.fillStyle = "red";
    ctx.fillText("Reason: AFK for 10 minutes", canvas.width / 2, canvas.height / 2 + 300);
    ctx.fillStyle = "white";

    chatInput.style.display = "none";
    chatArea.style.display = "none";
    chatUI.style.display = "none";
    leaderboardElement.lbEl.style.display = "none";

  } else {
    requestAnimationFrame(() => {
      try {
        renderGame();
      } catch (err) { console.error(err) };
    });
  }

  //console.log(playerOffset.x, playerOffset.y)
  //lihting
  /*ctx.globalCompositeOperation = "destination-in";//light mode
  ctx.beginPath();
  
  //will it work with 2 seperate?//can we like.. moveTo()
  ctx.moveTo(center.x, center.y)
	let angle = Math.atan2(mouseY - center.y, mouseX - center.x);
	
  ctx.arc(center.x, center.y, 100, 0, Math.PI*2);

  ctx.moveTo(center.x - Math.cos(angle) * players[selfId].radius, center.y - Math.sin(angle) * players[selfId].radius);
  //it doesnt update lmao
  ctx.arc(center.x - Math.cos(angle) * players[selfId].radius, center.y - Math.sin(angle) * players[selfId].radius, 600, angle-0.6, angle+0.6);
	ctx.fillStyle = "black";
  ctx.fill();
  ctx.closePath();

  ctx.globalCompositeOperation = "source-over";//normal mode
  */

  if (state == "game") {
    //Hero Card
    if (toggleHeroCard) {
      ctx.font = "20px 'Exo 2'";
      ctx.fillStyle = "black";
      //ctx.fillText(kbps + " kbps", canvas.width - 100, canvas.height - 260);
      //renderHeroCard(players[selfId]);
    }

    //Map Title
    renderMapName(players[selfId]);

    //victory text
    if (victoryTexts[world]) {
      if (victoryTexts[world][area]) {
        renderVictoryText(world, area);
      }
    }

    //Minimap
    minimap.render(ctx);
    minimap.drawPlayer(ctx, players[selfId]);

    if(area % 2 == 0){
      document.getElementById("chatUI").style.display = "none";
      document.getElementById("chatUI").blur();
      leaderboardElement.toggle(false)
    } else {
      document.getElementById("chatUI").style.display = "";
      document.getElementById("chatUI").focus();
      leaderboardElement.toggle(true)
    }


    //PP Animation
    if (world == "Peaceful Plains" && area >= 30) {
      ppAnimation(delta);
    }
    //FF red 
    if (world == "Furious Fraud" && area >= 10) {
      ctx.globalAlpha = (area - 10) / 50;
      ctx.fillStyle = "red";
      ctx.fillRect(0, 0, 1600, 900);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
let ppTime = 0;
let ppReset = false;
let ppTime2 = 0;
let oldToggleLB = null;
let oldToggleChat = null;
let glitchSquares = [];
let lastAnimationToggled = false;
let sliceAmount = 0;
class GlitchSquare {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.h = h;
    this.w = w;
    this.life = 1000;
  }
}
function ppAnimation(delta) {
  //Peaceful Plains Animation.
  let player = players[selfId];
  if (area == 30) {
    if (player.x >= 3210) {
      ppTime += delta;
      ctx.fillStyle = "black";
      ctx.globalAlpha = ppTime / 1000;
      ctx.fillRect(0, 0, 2000, 2000);
      oldToggleLB = toggleLB;
      oldToggleChat = toggleChat;
    }
  }
  if (area == 31) {
    document.getElementById("chatUI").style.display = "none";
    document.getElementById("chatUI").blur();
    leaderboardElement.toggle(false)
    if (ppReset == false) {
      ppReset = true;
      ppTime = 0;
    }
    ppTime += delta;
    if (ppTime > 5000) {
      ppTime = 5000;
    }
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 100000, 100000);

    ctx.beginPath();
    ctx.fillStyle = "#29162b";
    ctx.arc(1280 / 2, 720 / 2, 5000 - ppTime, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = Math.max((1000 - ppTime) / 1000, 0);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 100000, 100000);

    if (ppTime == 5000) {
      ppTime2 += delta;
      ctx.globalAlpha = ppTime2 / 4000;
      ctx.fillStyle = `rgb(${Math.random() * 40}, ${Math.random() * 30}, ${Math.random() * 20})`;
      ctx.fillRect(0, 0, 10000, 10000);

      ctx.fillStyle = "red";
      ctx.globalAlpha = Math.min(Math.max(ppTime2 / 2000, 0), 1);
      ctx.font = "100px 'Courier New'";
      ctx.fillText('it was all', 1280 / 2, 720 / 2 - 100);
      ctx.globalAlpha = Math.min(Math.max((ppTime2 - 1500) / 1000, 0), 1);
      ctx.fillText("just a lie", 1280 / 2, 720 / 2 + 100);

    }
  }
  if (area < 41) {
    if (area >= 32) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = `rgb(${(area - 32) * 12}, 0, 0)`;
      ctx.fillRect(0, 0, 10000, 10000);

      glitchSquares = glitchSquares.filter((e) => e.life > 0)
      for (let i of glitchSquares) {
        ctx.globalAlpha = i.life / 1000;
        ctx.fillStyle = `rgb(${Math.random() * 140}, ${Math.random() * 130}, ${Math.random() * 120})`;
        ctx.fillRect(i.x, i.y, i.w, i.h);
        i.life -= delta;
      }
      ctx.globalAlpha = 1;
    }
    if (area == 32) {
      if (ppReset == true) {
        ppReset = false;
        ppTime2 = 0;
        toggleLB = oldToggleLB;
        toggleChat = oldToggleChat;
        if (toggleChat == true) {
          document.getElementById("chatUI").style.display = "block";
          chatArea.scrollTop = chatArea.scrollHeight;
        }
        if (toggleLB == true) {
          leaderboardElement.toggle(true);
        }
      }
      ppTime -= delta;
      if (ppTime < 0) {
        ppTime = 3000 + Math.random() * 3000;
        glitchSquares.push(new GlitchSquare(Math.random() * 1380 - 100, Math.random() * 820 - 100, 100, 100));
      }
    }
    if (area >= 33) {
      ppTime -= delta * 3;
      if (ppTime < 0) {
        ppTime = (3000 - (area - 33) * 305) + Math.random() * (3000 - (area - 33) * 305);
        glitchSquares.push(new GlitchSquare(Math.random() * 1380 - 100, Math.random() * 820 - 100, 100, 100));
      }
    }
    if (area == 40) {
      if (lastAnimationToggled == false) {
        if (player.x >= 4600) {
          document.getElementById("chatUI").style.display = "none";
          document.getElementById("chatUI").blur();
          leaderboardElement.toggle(false)
          //second animation
          ppTime2 += delta;
          ctx.globalAlpha = Math.min(ppTime2 / 1000, 1);
          ctx.fillStyle = "black";
          ctx.fillRect(0, 0, 1600, 900);
          ctx.fillStyle = "white";
          ctx.globalAlpha = 1;
          ctx.font = "60px 'Courier New'";
          sliceAmount += 0.005 * delta;
          ctx.fillText("Universe simulation terminated.".slice(0, Math.floor(sliceAmount)), 1280 / 2, 720 / 2);
        }
      }
    }
  }
  if (area == 41) {
    if (ppReset == false) {
      if (toggleChat == true) {
        document.getElementById("chatUI").style.display = "block";
        chatArea.scrollTop = chatArea.scrollHeight;
      }
      if (toggleLB == true) {
        leaderboardElement.toggle(true);
      }
      ppReset = true;
      ppTime = 0;
    }
    ctx.fillStyle = "black";
    ppTime += delta;
    if (ppTime > 2000) {
      ppTime = 2000;
    }
    ctx.globalAlpha = 1 - ppTime * 0.15 / 2000;
    ctx.fillRect(0, 0, 10000, 10000);
    lastAnimationToggled = true;
  }
}


function cnc() {
  ctx.fillStyle = "#333333";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "50px 'Exo 2'";
  ctx.fillStyle = "red";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("There are too many clients on with your IP.", canvas.width / 2, canvas.height / 2);

  ctx.fillStyle = "white";
  chatInput.style.display = "none";
  chatArea.style.display = "none";
  chatUI.style.display = "none";
  leaderboardElement.lbEl.style.display = "none";
  menu.style.display = "none";
  join.style.display = "none";
  document.getElementById("links").style.display = "none";
  game.style.display = "inherit";
}

function endGame() {
  if (Date.now() - startTime < timeTaken) {
    timeTaken = Date.now() - startTime;
  }
  let s = Math.floor(timeTaken / 1000);
  let m = Math.floor(s / 60);
  s = s % 60;
  const fWorld = world;
  const fArea = area;
  const fM = m;
  const fS = s;
  const fHero = yourHero;
  const fDied = !haveDied;

  ctx.fillStyle = "#333333";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "50px 'Exo 2'";
  ctx.fillStyle = "white";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("You Died", canvas.width / 2, canvas.height / 2 - 100);
  ctx.font = "40px 'Exo 2'";
  ctx.fillText("Name: " + currentPlayer.name, canvas.width / 2, canvas.height / 2);
  ctx.fillText("World: " + fWorld, canvas.width / 2, canvas.height / 2 + 50);
  ctx.fillText("Area: " + fArea, canvas.width / 2, canvas.height / 2 + 100);
  ctx.fillText("Time: " + fM + "m" + fS + "s", canvas.width / 2, canvas.height / 2 + 150);
  ctx.fillText("Hero: " + fHero, canvas.width / 2, canvas.height / 2 + 200);
  ctx.fillText("Solo: " + fDied, canvas.width / 2, canvas.height / 2 + 250);
  ctx.fillStyle = "red";
  if (reason) ctx.fillText("Kick reason: " + reason, canvas.width / 2, canvas.height / 2 + 300);
  ctx.fillStyle = "white";
  chatInput.style.display = "none";
  chatArea.style.display = "none";
  chatUI.style.display = "none";
  leaderboardElement.lbEl.style.display = "none";
}

document.getElementById("guest").onclick = () => {
  serversDiv.style.display = "";
  menu.style.display = "none";
  join.style.display = "none";
  Cookies.set("lgkey", null, { expires: 365 });
  ws.send(msgpack.encode({
    type: "guest"
  }))
}
document.getElementById("login").onclick = () => {
  ws.send(msgpack.encode({
    type: "login",
    username: document.getElementById("username").value,
    password: document.getElementById("password").value
  }))
}
document.getElementById("register").onclick = () => {
  ws.send(msgpack.encode({
    type: "register",
    username: document.getElementById("username").value,
    password: document.getElementById("password").value
  }))
}

let startTime = null;
let yourHero = null;
function init(hero) {
  menu.style.display = "none";
  join.style.display = "none";
  game.style.display = "";
  document.getElementById("links").style.display = "none";
  inGame = true;
  document.getElementById("closeSettings").onclick = () => {
    document.getElementById("settings").style.display = "none";
    inGame = true;
  }

  if (Cookies.get("lgkey") != undefined) {
    loginKey = Cookies.get("lgkey")
  }
  ws.send(msgpack.encode({ begin: true, hero: hero, loginKey: loginKey }))
  mouseToggleC = 0;
  state = "game";
  document.body.classList.remove("body-menu-bg");
  startTime = Date.now();
  yourHero = hero;
}


function Resize() {
  let scale = window.innerWidth / canvas.width;
  if (window.innerHeight / canvas.height < window.innerWidth / canvas.width) {
    scale = window.innerHeight / canvas.height;
  }
  canvas.style.transform = "scale(" + scale + ")";
  canvas.style.left = 1 / 2 * (window.innerWidth - canvas.width) + "px";
  canvas.style.top = 1 / 2 * (window.innerHeight - canvas.height) + "px";
  var rect = canvas.getBoundingClientRect();
  chatUI.style.left = rect.left + "px";
  chatUI.style.top = rect.top + "px";
  leaderboardElement.lbEl.style.right = rect.left == 0 ? "0.8vw" : rect.left + 10 + "px";
  leaderboardElement.lbEl.style.top = rect.top + 10 + "px";
  if (snowParticles) snowParticles.resize();
}
Resize();

window.addEventListener('resize', function () {
  Resize();
});

let haveDied = false;

let KEY_TO_ACTION = {
  "shift": "5",
  "shiftleft": "5",
  "shiftright": "5",
  "arrowup": "1",
  "arrowleft": "2",
  "arrowdown": "3",
  "arrowright": "4",
}

const allowedKeys = ["bracketleft", "bracketright", "backslash", "quote", "semicolon", "slash", "period", "comma"];

function initCodes() {
  let customKeys = localStorage.getItem("custom-keycodes");
  if (customKeys) {
    KEY_TO_ACTION = {
      "shift": "5",
      "shiftleft": "5",
      "shiftright": "5",
      "arrowup": "1",
      "arrowleft": "2",
      "arrowdown": "3",
      "arrowright": "4"
    };
    customKeys = JSON.parse(customKeys);
    /*customKeys = Object.assign({
      "keyw": "1",
      "keya": "2",
      "keys": "3",
      "keyd": "4",
      "keyz": "8",
      "keyx": "9",
      "keyj": "8",
      "keyk": "9",
		  //"keyt": "6",
      //"keye": "7",
      //"keyr": "10",
      "keyb": "01",
      "keyh": "02",
      "keyp": "03",
      "keyv": "04",
    }, customKeys)*/
    Object.assign(KEY_TO_ACTION, customKeys);
  } else {
    KEY_TO_ACTION = {
      "shift": "5",
      "shiftleft": "5",
      "shiftright": "5",
      "arrowup": "1",
      "arrowleft": "2",
      "arrowdown": "3",
      "arrowright": "4",
      "keyw": "1",
      "keya": "2",
      "keys": "3",
      "keyd": "4",
      "keyz": "8",
      "keyx": "9",
      "keyj": "8",
      "keyk": "9",
			/*"keyt": "6",
      "keye": "7",
      "keyr": "10",*/
      "keyb": "01",
      "keyh": "02",
      "keyp": "03",
      "keyv": "04",
    }
  }

  let displayedKeys = [];
  document.querySelectorAll(".keyCodeEl").forEach((btn) => {
    for (let i in KEY_TO_ACTION) {
      if (KEY_TO_ACTION[i] == btn.ariaLabel && !["arrowup", "arrowleft", "arrowdown", "arrowright", "shift", "shiftleft", "shiftright", ...displayedKeys].includes(i)) {
        btn.innerHTML = i.startsWith("key") ? (i[0].toUpperCase() + i.substring(1, i.length - 1) + i[i.length - 1].toUpperCase()) : i;
        displayedKeys.push(i);
        break;
      }
    }
  })
}
initCodes();

function resetKeycodes() {
  localStorage.removeItem("custom-keycodes");
  initCodes();
}
let v = {
  left: false,
  right: false,
  up: false,
  down: false
}
document.onkeydown = function (e) {
  anti_afk = 0;
  chatting = document.activeElement.hasAttribute("lock-chat");
  if (e.code == "Escape" && state == "game" && !chatting) {
    if (settingaccode) return;
    let el = document.getElementById("settings");
    if (el.style.display == "") {
      inGame = true;
      el.style.display = "none";
    } else {
      el.style.display = "";
      mouseToggleC = 0;
      ws.send(msgpack.encode("mn"));
      inGame = false;
    }
  } else
    if (e.code == "Enter" && !e.repeat && inGame) {
      if (!document.activeElement.hasAttribute("lock-chat") && Date.now() - chatElement.lastSent > 10) {
        document.getElementById("chatInput").focus();
      }
    }
  if (chatting == false && inGame) {
    if (KEY_TO_ACTION[e.code.toLowerCase()] == "04") {
      toggleChat = !toggleChat
      if (toggleChat) {
        document.getElementById("chatUI").style.display = "block";
        chatArea.scrollTop = chatArea.scrollHeight;
      } else {
        document.getElementById("chatUI").style.display = "none";
        document.getElementById("chatUI").blur();
      }
    } else if (KEY_TO_ACTION[e.code.toLowerCase()] == "01") {
      leaderboardElement.toggle(toggleLB = !toggleLB);
    } else if (KEY_TO_ACTION[e.code.toLowerCase()] == "02") {
      toggleHeroCard = !toggleHeroCard;
    } else if (KEY_TO_ACTION[e.code.toLowerCase()] == "03") {
      localStorage.setItem("tiles-enabled", toggleTiles = !toggleTiles);
    }
    if (KEY_TO_ACTION[e.code.toLowerCase()] != undefined && !KEY_TO_ACTION[e.code.toLowerCase()].startsWith("0")) {
      let k = KEY_TO_ACTION[e.code.toLowerCase()];

      if (parseInt(k) <= 4) {
        switch (k) {
          case "1": {
            if (v.up == false) {
              ws.send(msgpack.encode({ kD: k }));
            }
            v.up = true;
            break;
          }
          case "2": {
            if (v.left == false) {
              ws.send(msgpack.encode({ kD: k }));
            }
            v.left = true;
            break;
          }
          case "3": {
            if (v.down == false) {
              ws.send(msgpack.encode({ kD: k }));
            }
            v.down = true;
            break;
          }
          case "4": {
            if (v.right == false) {
              ws.send(msgpack.encode({ kD: k }));
            }
            v.right = true;
            break;
          }
        }
      } else {
        ws.send(msgpack.encode({ kD: k }));
      }
    }
    if (e.code == "Tab") {
      let index = spectatingOrder.indexOf(spectatingIndex);
      if (spectatingOrder[index + 1]) {
        spectatingIndex = spectatingOrder[index + 1];
      } else {
        spectatingIndex = spectatingOrder[0];
      }
      e.preventDefault();
    }
  }
}

document.onkeyup = function (e) {
  anti_afk = 0;
  chatting = document.activeElement.hasAttribute("lock-chat");
  if (inGame) {
    if (KEY_TO_ACTION[e.code.toLowerCase()] != undefined) {
      let k = KEY_TO_ACTION[e.code.toLowerCase()];

      if (parseInt(k) <= 4) {
        switch (k) {
          case "1": {
            if (v.up == true) {
              ws.send(msgpack.encode({ kU: k }));
            }
            v.up = false;
            break;
          }
          case "2": {
            if (v.left == true) {
              ws.send(msgpack.encode({ kU: k }));
            }
            v.left = false;
            break;
          }
          case "3": {
            if (v.down == true) {
              ws.send(msgpack.encode({ kU: k }));
            }
            v.down = false;
            break;
          }
          case "4": {
            if (v.right == true) {
              ws.send(msgpack.encode({ kU: k }));
            }
            v.right = false;
            break;
          }
        }
      } else {
        ws.send(msgpack.encode({ kU: k }));
      }
    }
  }
}

let lastmp = [mouseX, mouseY];
let smpi = setInterval(() => {
  if (snowParticles) snowParticles.update();
  if (state == "game" && inGame && mouseEnabled && mouseToggleC == 2) {
    if (lastmp[0] != Math.round(mouseX * 10) / 10 || lastmp[1] != Math.round(mouseY * 10) / 10) {
      lastmp = [Math.round(mouseX * 10) / 10, Math.round(mouseY * 10) / 10];
      ws.send(msgpack.encode({ mp: lastmp }));
    }
  }
}, 1000 / 30);

function getCursorPosition(canvas, event) {
  anti_afk = 0;
  var rect = canvas.getBoundingClientRect(),
    scaleX = canvas.width / rect.width,
    scaleY = canvas.height / rect.height;

  mouseX = (event.clientX - rect.left) / (rect.right - rect.left) * canvas.width;
  mouseY = (event.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height;
}
window.addEventListener('mousedown', function (e) {
  anti_afk = 0;
  if (state == "game") {
    getCursorPosition(canvas, e);
    if (mouseEnabled && e.target.tagName.toLowerCase() == "canvas") {
      if (mouseToggleC == 0) {
        mouseToggleC = 1;
      } else if (mouseToggleC == 2) {
        mouseToggleC = 3;
      }
    }
  }
});
window.addEventListener('mousemove', function (e) {
  anti_afk = 0;
  getCursorPosition(canvas, e);
})

window.addEventListener('touchmove', function (e) {
  anti_afk = 0;
  if (mouseEnabled) {
    e.clientX = e.touches[0].clientX;
    e.clientY = e.touches[0].clientY;
    getCursorPosition(canvas, e.touches[0]);

  }
})

window.addEventListener('touchstart', function (e) {
  anti_afk = 0;
  if (state == "game" && inGame && e.target.tagName.toLowerCase() == "canvas") {
    mouseEnabled = true;
    mouseToggleC = 2;
    ws.send(msgpack.encode("my"));
    e.clientX = e.touches[0].clientX;
    e.clientY = e.touches[0].clientY;
    getCursorPosition(canvas, e);
  }
})

window.addEventListener('touchend', function (e) {
  anti_afk = 0;
  mouseEnabled = false;
  mouseToggleC = 0;
  ws.send(msgpack.encode("mn"));
})

window.addEventListener('mouseup', function (e) {
  anti_afk = 0;
  if (inGame && state == "game") {
    if (mouseEnabled) {
      if (mouseToggleC == 1) {
        mouseToggleC = 2;
      } else if (mouseToggleC == 3) {
        mouseToggleC = 0;
      }
      if (mouseToggleC == 2) {
        //mouse on (yes)
        ws.send(msgpack.encode("my"));
        getCursorPosition(canvas, e);
      } else {
        //mouse off (no)
        ws.send(msgpack.encode("mn"));
      }
    }
  }
});

function appendChatMessage(message) {
  let owner = message.owner;
  let txt = message.chat;
  let type = message.type;
  const typeData = CONSTANTS.chat[type] || CONSTANTS.chat["_default"];

  if (!typeData.nonBlockable) {
    if (blockedPlayers[owner]) return;
  }

  let scroll =
    chatArea.scrollTop + chatArea.clientHeight >=
    chatArea.scrollHeight - 5;

  let newSpan = document.createElement("span");
  newSpan.classList.add("inlineMsg");
  newSpan.innerText = owner;
  let newDiv = document.createElement("div");


  newDiv.classList.add(typeData.className);

  let newSpan2 = document.createElement("span");
  newSpan2.classList.add("inlineMsg");

  newDiv.prepend(": " + txt);
  newDiv.prepend(newSpan);
  newDiv.style.whiteSpace = "normal";

  if (chatSelfRegex && chatSelfRegex.test && chatSelfRegex.test(txt)) newDiv.classList.add("mentioned");

  if (typeData.tag) {
    let tagDiv = document.createElement("span");
    tagDiv.classList.add(typeData.tag.className);
    tagDiv.innerText = `${typeData.tag.text} `;
    newDiv.prepend(tagDiv);
  }

  chatArea.appendChild(newDiv);

  if (scroll) {
    chatArea.scrollTop = chatArea.scrollHeight;
  }
}

console.log('%cEvades2!', [
  'color: powerBlue',
  'text-shadow: 1px 2px purple',
  'background: plum',
  'font-size: 3em',
  'border: 1px solid purple',
  'padding: 20px',
  'font-family: Geneva',
].join(';'))


window.setInterval = () => { };
setInterval = () => { };
//???????????????