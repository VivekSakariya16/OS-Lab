var track = 0;  // Counting Semaphore
var mutex = 1;  // Binary Semaphore

// Up Function
function down(track, consumed) {
  track -= consumed;
  return track;
}

// Down Function
function up(track) {
  track++;
  return track;
}

// Producer code which produces n process
// Complexity: O(n)
function producer() {
  var space = document.getElementById("space").value;
  var produced_items = document.getElementById("produced").value;
  var items_added = document.getElementById("added");
  space++;

  if (mutex == 1) {
    down(mutex, 1);
    if (parseInt(track) + parseInt(produced_items) >= space) {
      alert("No space");
    } else {
      for (var i = 0; i < produced_items; i++) {
        var o =
          '<button type="button" class="btn ml-3 my-2 third" id = ' +
          (track + 1) +
          ' onclick="add_entry(this.id)">' +
          "Process" +
          (track + 1) +
          "</button>";
        track=up(track);
        items_added.innerHTML += o;
      }
    }
    up(mutex);
  }
}

// Consumer code which consumes n process
// Complexity: O(n)
function consumer() {
  var space = document.getElementById("space").value;
  var consumed_items = document.getElementById("consumed").value;

  space++;

  if (mutex == 1) {
      down(mutex);
    if (track - consumed_items >= 0) {
      for (var i = track; i > track - consumed_items; i--) {
        var x = document.getElementById(i);
        x.remove();
      }
      track=down(track,consumed_items);
    } else {
      alert("Not enough items produced");
    }
    up(mutex);
  }
}

function reset() {
  track = 0;
}
