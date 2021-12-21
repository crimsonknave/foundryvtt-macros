// Method Definitions
async function roll(table) {
  table = game.tables.entities.find(t => t.name === table);
  roll = await table.roll()
  let processed_results = _.map(roll.results, function(result, i) {
    id = result.data.resultId;
    if (id == null) {
      return result.data.text;
    } else {
      text = result.data.text;
      collection = result.data.collection;
      type = game.journal.get(id).data.flags["kanka-foundry"].type;
      if (type == "family"){
        text = "the " + text + " family";
      } else if (type == "organisation") {
        text = "the " + text;
      }

      return "@" + collection + "[" + id + "]{" + text + "}";
    }
  });
  return _.reduce(processed_results, function(memo, result) { return memo + " " + result}, "").trim();
}
var generate_name = function() {
  var name = null;
  $.ajax({
    async: false,
    url: "https://chartopia.d12dev.com/test/dice-roll-result?chart_id=32000",
    success: function(result){
      name = $($.parseHTML(result)).find("p")[0].innerText;
    }
  });
  return name;
};

let filter_tokens = function(search) {
  choices = _.filter(game.moulinette.cache.cache["moulinette/images/custom/index.json"][0].packs[2].assets, function(path){
    path_parts = _.split(path, "/");
    if (path_parts[0] != "humanoid") {
      return false;
    }
    token_desc = path_parts[path_parts.length - 1];
    return token_desc.match(search);
  });
  return choices;
}

let find_guard_token = function(race) {
  race_bits = _.split(race, " ");
  main_race = race_bits[race_bits.length - 1];
  let full_regex = new RegExp(main_race + ".*(guard|rogue|paladin|fighter|barbarian|monk|blood hunter| cleric)", "i");
  let choices = filter_tokens(full_regex);
  if (choices.length === 0) {
    // -guard will pull the 1-guard style tokens which are top down and fairly race agnostic
    choices = filter_tokens(/-guard/);
  }
  // Select down to guard
  pick = _.random(0, choices.length - 1);
  token_file = choices[pick];
  return "moulinette/images/custom/2minutetabletop/tokens_sorted/" + token_file;
};

// Hook check
// If this were a module, we'd have a hook on load, but it's not so we check every time
if (game.crimsonknave && game.crimsonknave.hooked) {
} else {
  console.log("crimsonknave object not initialized, doing so and adding hook.");
  game.crimsonknave = {};
  game.crimsonknave.guard_hooked = false;

  if (Object.keys(game.moulinette.cache.cache).length === 0) {
    ui.notifications.error("Moulinette cache not built");
  } else {
    let create_actor = async function(data) {
      ddb_monsters = game.packs.get("world.ddb-marith-monsters");
      await ddb_monsters.getIndex();
      let guard_id = ddb_monsters.index.find(m => m.name === "Guard")._id;
      let guard_npc = await ddb_monsters.getDocument(guard_id);
      let guard_npc_data = guard_npc.data;
      let actor = await Actor.create({
        name: data.name,
        type: "npc",
        img: data.token,
        data: guard_npc_data.data,
        items: guard_npc_data.items
      });
      actor_updates = {}
      actor_updates["data.details.biography.value"] = data.npc;
      actor_updates["data.details.type.value"] = "humanoid";
      actor_updates["data.details.type.subtype"] = data.race;
      actor_updates["token.actorLink"] = true;
      actor_updates["token.disposition"] = parseInt(data.disposition);

      actor.update(actor_updates);
    }

    $(document).on('click', '.npc-create', function () {
      data = $(this).data();
      create_actor(data);
      ui.notifications.info("Created " + data.name);

    });
    ui.notifications.info("NPC Creation Hook Registered");
    game.crimsonknave.guard_hooked = true;
    console.log("Create NPC hook attached");
  }

}

// Generate data

if (game.crimsonknave.guard_hooked == false) {
  console.log("Not guard_hooked, don't try to make the NPC");
  throw "Not guard_hooked";
}
let [
age,
race,
attitude,
modifier,
trouble
] = await Promise.all([
roll("Age"),
roll("Races"),
roll("Attitude"),
roll("High Concept Modifier"),
roll("Trouble"),
]);

let token_disposition = 0;
if (_.includes(["is hostile towards", "is scared of"], attitude)){
  token_disposition = -1;
} else if (_.includes(["is interested in", "is friendly towards", "wants something from"], attitude)) {
  token_disposition = 1;
}

let token = find_guard_token(race);

name = generate_name();

// Build chat message
let description = "<b>" + name + "</b>, " + age + " " + race + " that " + attitude + " the party";
let npc = description + "<br/><b>High Concept:</b> " + modifier + " Guard<br/><b>Trouble:</b> " + trouble;
avatar = "<img src='" + token + "'/>";
button = $("<button class='npc-create'>Create NPC</button>");
button.attr("data-name", name);
button.attr("data-race", race);
button.attr("data-npc", npc);
button.attr("data-token", token);
button.attr("data-disposition", token_disposition);
let output = avatar + npc + "<br/><br/>" + button.get(0).outerHTML

let chatData = {
  user: game.userId,
  speaker: ChatMessage.getSpeaker(),
  content: output,
};
ChatMessage.create(chatData, {});

