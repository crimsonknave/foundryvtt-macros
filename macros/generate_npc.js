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

let find_token = function(string) {
  console.log(string);
  let search = new RegExp(string, 'i');
  choices = _.filter(game.moulinette.cache.cache["moulinette/images/custom/index.json"][0].packs[2].assets, function(path){
    path_parts = _.split(path, "/");
    token_desc = path_parts[path_parts.length - 1];
    return token_desc.match(search);
  });
  if (choices.length === 0) {
    console.log("No tokens found for " + string);
    return null;
  }
  pick = _.random(0, choices.length);
  token_file = choices[pick];
  console.log(token_file);
  return "moulinette/images/custom/2minutetabletop/tokens_sorted/" + token_file;
};

let [
age,
race,
attitude,
high_concept,
trouble
] = await Promise.all([
roll("Age"),
roll("Races"),
roll("Attitude"),
roll("High Concept"),
roll("Trouble"),
]);

let token_disposition = 0;
if (_.includes(["is hostile towards", "is scared of"], attitude)){
  token_disposition = -1;
} else if (_.includes(["is interested in", "is friendly towards", "wants something from"], attitude)) {
  token_disposition = 1;
}

let token = find_token(race);
if (token == null) {
  race_bits = _.split(race, " ");
  console.log(race_bits);
  main_race = race_bits[race_bits.length - 1];
  token = find_token(main_race);
}

name = generate_name();
console.log(race);
let description = "<b>" + name + "</b>, " + age + " " + race + " that " + attitude + " the party"
let npc = description + "<br/><b>High Concept:</b> " + high_concept + "<br/><b>Trouble:</b> " + trouble
avatar = "<img src='" + token + "'/>"
let output = avatar + npc + "<br/><br/><button class='npc-create' data-name='" + name + "' data-race='" + race + "' data-npc='" + npc + "' data-token='" + token + "' data-disposition=" + token_disposition + ">Create NPC</button>"

let chatData = {
  user: game.userId,
  speaker: ChatMessage.getSpeaker(),
  content: output,
};
ChatMessage.create(chatData, {});
