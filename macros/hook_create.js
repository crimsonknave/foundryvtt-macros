if (Object.keys(game.moulinette.cache.cache).length === 0) {
  ui.notifications.error("Moulinette cache not built");
} else {
  let create_actor = async function(data) {
    let actor = await Actor.create({
      name: data.name,
      type: "npc",
      img: data.token
    });
    actor_updates = {}
    actor_updates["data.details.biography.value"] = data.npc;
    actor_updates["data.details.type.value"] = "humanoid";
    actor_updates["data.details.type.subtype"] = data.race;
    actor_updates["token.actorLink"] = true;
    actor_updates["token.disposition"] = parseInt(data.disposition);

    actor.update(actor_updates);
    console.log(actor);
  }

  $(document).on('click', '.npc-create', function () {
    data = $(this).data();
    create_actor(data);
    ui.notifications.info("Created " + data.name);

  });
  ui.notifications.info("NPC Creation Hook Registered");
}
