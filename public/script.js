let allLocations = [];
let allColours = [];
let allMainColours = [];
let allTypes = [];
let usedTypes = [];

// Function to convert file to Base64
function getBase64(file, callback, quality = 0.5, maxDimension = 512) {
  const reader = new FileReader();

  reader.onload = function () {
    const img = new Image();
    img.onload = function () {
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDimension) {
          height *= maxDimension / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width *= maxDimension / height;
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Set canvas dimensions to the new calculated dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw the resized image on the canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Convert the canvas to a Base64-encoded string
      const base64 = canvas.toDataURL('image/jpeg', quality);
      callback(base64);
    };

    img.src = reader.result; // Set img source to the file reader result
  };

  reader.readAsDataURL(file);
}


function invertColor(hex, bw) {
  if (hex.indexOf("#") === 0) {
    hex = hex.slice(1);
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
    throw new Error("Invalid HEX color.");
  }
  var r = parseInt(hex.slice(0, 2), 16),
    g = parseInt(hex.slice(2, 4), 16),
    b = parseInt(hex.slice(4, 6), 16);
  if (bw) {
    // https://stackoverflow.com/a/3943023/112731
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? "#000000" : "#FFFFFF";
  }
  // invert color components
  r = (255 - r).toString(16);
  g = (255 - g).toString(16);
  b = (255 - b).toString(16);
  // pad each with zeros and return
  return "#" + padZero(r) + padZero(g) + padZero(b);
}

function idToHexColor(id) {
  let hash = 0;
  const str = id.toString();

  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ("00" + value.toString(16)).slice(-2);
  }

  return color;
}

// Fetch and display all clothes
function loadClothingList() {
  fetch("/clothes")
    .then((response) => response.json())
    .then((data) => {
      const clothingList = document.getElementById("clothingList");
      clothingList.innerHTML = "";
      data = data.sort((a, b) => a.name.localeCompare(b.name));
      data.forEach((item) => {
        if (!allColours.includes(item.color_name)) {
          allColours.push(item.color_name);
          allColours = allColours.sort();
        }

        if (!usedTypes.includes(item.type)) {
          usedTypes.push(item.type);
        }

        if (!allMainColours.includes(item.closest_color)) {
          allMainColours.push(item.closest_color);
        }

        const div = document.createElement("div");
        div.setAttribute("data-location", item.location_name);
        div.setAttribute("data-type", item.type);
        div.setAttribute("data-id", item.id);
        div.setAttribute("data-color", item.closest_color);
        div.classList =
          "col-6 col-sm-6 col-md-4 col-lg-3 col-xl-2 mb-2 clothingItem";
        div.innerHTML = `
        <div class="card">
                    <img src="${item.image}" class="card-img-top" alt="${item.name
          }">
                    <div class="card-body">
                        <h5 class="card-title">${item.name}</h5>
                        <p class="card-text">
                            Type: <span class="badge rounded-pill" style="background-color: ${idToHexColor(item.type)}; color: ${invertColor(idToHexColor(item.type), true)}">${item.type
          }</span><br />
                            Colour: <span class="badge rounded-pill" style="background-color: ${item.color
          }; color: ${invertColor(item.color, true)}">${item.color_name
          }</span>
                        </p>
                    </div>

                    <span class="badge rounded-pill m-2" style="background-color: ${idToHexColor(item.location_name)}; color: ${invertColor(idToHexColor(item.location_name), true)}">${item.location_name
          }</span>
                </div>
                `;
        clothingList.appendChild(div);
      });

      const filterMenu = document.getElementById("filterMenuColour");

      filterMenu.innerHTML = `
                <li><a class="dropdown-item disabled" href="#">Colour</a></li>`;

      allMainColours.forEach((colour) => {
        const li = document.createElement("li");

        const div = document.createElement("div");
        div.classList.add("form-check", "m-2");

        const input = document.createElement("input");
        input.classList.add("form-check-input", "filter-input");
        input.type = "checkbox";
        input.value = colour;
        input.id = colour + "Check";
        input.checked = true;

        input.onchange = function (event) {
          event.preventDefault();

          let elements = document.querySelectorAll(".clothingItem");

          for (let i = 0; i < elements.length; i++) {
            if (elements[i].getAttribute("data-color") == colour) {
              if (input.checked) {
                elements[i].classList.remove("hidden-location");
              } else {
                elements[i].classList.add("hidden-location");
              }
            }
          }
        };

        const label = document.createElement("label");
        label.classList.add("form-check-label");
        label.setAttribute("for", colour + "Check");
        label.innerHTML = `<span class="badge rounded-pill" style="background-color: ${colour}; color: ${colour == "Purple" || colour == "Black" || colour == "Brown" ? "white" : "black"}">${colour}</span>`; // Set the text inside the label

        // Append input and label to div
        div.appendChild(input);
        div.appendChild(label);

        // Append div to li
        li.appendChild(div);

        // Append li to the desired parent (assuming ul exists with id "filterMenu")
        filterMenu.appendChild(li);
      })


      loadLocations();
    });
}

// Fetch locations to populate the dropdown
function loadLocations() {
  fetch("/locations")
    .then((response) => response.json())
    .then((locations) => {
      locations = locations.sort((a, b) => a.name.localeCompare(b.name));
      allLocations = locations;

      const locationSelect = document.getElementById("location");
      const filterMenu = document.getElementById("filterMenuLocation");

      locationSelect.innerHTML = ""; // Clear any existing options
      filterMenu.innerHTML = `
                <li><a class="dropdown-item disabled" href="#">Location</a></li>
                
            `;

      const option = document.createElement("option");
      option.value = "Location";
      option.textContent = "Location";
      option.disabled = true;
      option.selected = true;
      locationSelect.appendChild(option);

      locations.forEach((location) => {
        const option = document.createElement("option");
        option.value = location.id;
        option.textContent = location.name;
        locationSelect.appendChild(option);

        // Create <li> element
        const li = document.createElement("li");

        // Create <div> with class "form-check m-2"
        const div = document.createElement("div");
        div.classList.add("form-check", "m-2");

        // Create <input> element with class, type, value, id, and checked attribute
        const input = document.createElement("input");
        input.classList.add("form-check-input", "filter-input");
        input.type = "checkbox";
        input.value = location.name;
        input.id = location.name + "Check";
        input.checked = true;

        input.onchange = function (event) {
          event.preventDefault();

          let elements = document.querySelectorAll(".clothingItem");

          for (let i = 0; i < elements.length; i++) {
            if (elements[i].getAttribute("data-location") == location.name) {
              if (input.checked) {
                elements[i].classList.remove("hidden-location");
              } else {
                elements[i].classList.add("hidden-location");
              }
            }
          }
        };

        // Create <label> element with class and for attribute
        const label = document.createElement("label");
        label.classList.add("form-check-label");
        label.setAttribute("for", location.name + "Check");
        label.innerHTML = `<span class="badge rounded-pill" style="background-color: ${idToHexColor(location.name)}; color: ${invertColor(idToHexColor(location.name), true)}">${location.name}</span>`; // Set the text inside the label

        // Append input and label to div
        div.appendChild(input);
        div.appendChild(label);

        // Append div to li
        li.appendChild(div);

        // Append li to the desired parent (assuming ul exists with id "filterMenu")
        filterMenu.appendChild(li);
      });
      loadTypes();
      //   filterMenu.innerHTML += `<li>
      //                 <hr class="dropdown-divider">
      //             </li>`;
      //     addColourFilters();
    });
}

function loadTypes() {
  fetch("/types")
    .then((response) => response.json())
    .then((types) => {
      types = types.sort((a, b) => a.name.localeCompare(b.name));

      allTypes = types;

      const typesSelect = document.getElementById("type");
      const filterMenu = document.getElementById("filterMenuType");

      typesSelect.innerHTML = ""; // Clear any existing options
      filterMenu.innerHTML = `
                <li><a class="dropdown-item disabled" href="#">Types</a></li>
                
            `;

      const option = document.createElement("option");
      option.value = "Type";
      option.textContent = "Type";
      option.disabled = true;
      option.selected = true;
      typesSelect.appendChild(option);

      types.forEach((type) => {
        const option = document.createElement("option");
        option.value = type.id;
        option.textContent = type.name;
        typesSelect.appendChild(option);

        if (usedTypes.includes(type.name)) {
          // Create <li> element
          const li = document.createElement("li");

          // // Create <div> with class "form-check m-2"
          const div = document.createElement("div");
          div.classList.add("form-check", "m-2");

          // // Create <input> element with class, type, value, id, and checked attribute
          const input = document.createElement("input");
          input.classList.add("form-check-input", "filter-input");
          input.type = "checkbox";
          input.value = type.name;
          input.id = type.name + "Check";
          input.checked = true;

          input.onchange = function (event) {
            event.preventDefault();

            let elements = document.querySelectorAll(".clothingItem");

            for (let i = 0; i < elements.length; i++) {
              if (elements[i].getAttribute("data-type") == type.name) {
                if (input.checked) {
                  elements[i].classList.remove("hidden-type");
                } else {
                  elements[i].classList.add("hidden-type");
                }
              }
            }
          };

          // Create <label> element with class and for attribute
          const label = document.createElement("label");
          label.classList.add("form-check-label");
          label.setAttribute("for", type.name + "Check");
          label.innerHTML = `<span class="badge rounded-pill" style="background-color: ${idToHexColor(type.name)}; color: ${invertColor(idToHexColor(type.name), true)}">${type.name}</span>`; // Set the text inside the label

          // // Append input and label to div
          div.appendChild(input);
          div.appendChild(label);

          // // Append div to li
          li.appendChild(div);

          // // Append li to the desired parent (assuming ul exists with id "filterMenu")
          filterMenu.appendChild(li);
        }

      });
    });
}

// Add new clothing item
document
  .getElementById("addClothesForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const type = document.getElementById("type").value;
    const color = document.getElementById("color").value;
    const locationId = document.getElementById("location").value;
    const lastUsed = new Date().toISOString().slice(0, 10);
    const imageFile = document.getElementById("image").files[0];

    fetch(`https://www.thecolorapi.com/id?hex=${color.slice(1)}`)
      .then((resp) => resp.json())
      .then((json) => {
        let colourName = json.name.value;

        if (imageFile) {
          getBase64(imageFile, function (base64Image) {
            const clothingItem = {
              name,
              type,
              color,
              color_name: colourName,
              location_id: locationId,
              last_used: lastUsed,
              image: base64Image,
            };

            // Post the clothing item
            fetch("/clothes", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(clothingItem),
            }).then((response) => {
              if (response.ok) {
                loadClothingList();
                document.getElementById("name").value = "";
                document.getElementById("type").value = "";
                document.getElementById("color").value = "";
                document.getElementById("location").value = "Location";
                document.getElementById("image").value = "";
                document.getElementById("imagePreview").src = "";
                document.getElementById("imagePreview").style.display = "none";
              }
            });
          });
        }
      });
  });

// Add new location
document
  .getElementById("addLocationForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const locationName = document.getElementById("locationName").value;

    if (locationName) {
      const newLocation = { name: locationName };

      // Post the new location
      fetch("/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newLocation),
      }).then((response) => {
        if (response.ok) {
          // Reload locations to update dropdown
          loadLocations();

          // Reset form
          document.getElementById("locationName").value = "";
        }
      });
    }
  });

// Add new location
document
  .getElementById("addTypeForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const typeName = document.getElementById("typeName").value;

    if (typeName) {
      const newType = { name: typeName };

      // Post the new location
      fetch("/types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newType),
      }).then((response) => {
        if (response.ok) {
          // Reload locations to update dropdown
          loadTypes();

          // Reset form
          document.getElementById("typeName").value = "";
        }
      });
    }
  });

document.getElementById("enableEdit").addEventListener("click", () => {
  let items = document.querySelectorAll(".clothingItem");

  if (document.getElementById("enableEdit").textContent == "Edit") {
    document.getElementById("enableEdit").textContent = "Done";

    for (let i = 0; i < items.length; i++) {
      let footer = document.createElement("div");
      footer.classList = "card-footer";

      let editBtn = document.createElement("button");
      editBtn.classList = "btn btn-outline-warning m-1";
      editBtn.textContent = "Move";
      editBtn.setAttribute("data-id", items[i].getAttribute("data-id"));

      editBtn.onclick = () => {
        let select = document.createElement("select");
        select.classList = "form-select mb-3";

        for (let j = 0; j < allLocations.length; j++) {
          let option = document.createElement("option");
          option.value = allLocations[j].id;
          option.textContent = allLocations[j].name;
          if (allLocations[j].name == items[i].getAttribute("data-location")) {
            option.selected = true;
          }
          select.appendChild(option);
        }
        footer.appendChild(select);

        select.onchange = (event) => {
          let itemId = items[i].getAttribute("data-id"); // Assuming `i` is defined in the scope
          let newLocation = select.value;

          // Sending a PUT request to the endpoint
          fetch(`/clothes/${itemId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ location_id: newLocation }), // Sending the new location ID
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error("Network response was not ok");
              }
              return response.json();
            })
            .then((data) => {
              console.log("Success:", data);
              // Optionally, update the UI or notify the user
              document.getElementById("enableEdit").textContent = "Edit";
              loadClothingList();
            })
            .catch((error) => {
              console.error("Error:", error);
            });
        };
      };

      let deleteBtn = document.createElement("button");
      deleteBtn.classList = "btn btn-outline-danger m-1";
      deleteBtn.textContent = "Delete";
      deleteBtn.setAttribute("data-id", items[i].getAttribute("data-id"));

      deleteBtn.onclick = () => {
        let itemId = items[i].getAttribute("data-id"); // Assuming `i` is defined in the scope

        // Sending a DELETE request to the endpoint
        fetch(`/clothes/${itemId}`, {
          method: "DELETE",
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
            return response.json();
          })
          .then((data) => {
            console.log("Success:", data);
            // Optionally, update the UI or notify the user
            document.getElementById("enableEdit").textContent = "Edit";
            loadClothingList();
          })
          .catch((error) => {
            console.error("Error:", error);
          });
      };

      footer.appendChild(editBtn);
      footer.appendChild(deleteBtn);
      items[i].querySelector(".card").appendChild(footer);
    }
  } else {
    document.getElementById("enableEdit").textContent = "Edit";

    for (let i = 0; i < items.length; i++) {
      items[i].querySelector(".card-footer").remove();
    }
  }
});

document.getElementById("image").addEventListener("change", (event) => {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    const base64Image = reader.result;

    // fetch(`https://colourdetector.vps.daecloud.co.za/detect-color`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ image: base64Image }),
    // })
    //   .then((response) => response.json())
    //   .then((data) => {
    //     console.log(data);
    //     document.getElementById("color").value = data.color;
    //   })
    //   .catch((error) => {
    //     console.error("Error:", error);
    //   });
    document.getElementById("imagePreview").style.display = "block";
    document.getElementById("imagePreview").src = base64Image;
  };
  reader.readAsDataURL(file);
})

// Initial load
loadClothingList();
