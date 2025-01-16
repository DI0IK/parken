document.getElementById("date-select").value = new Date()
  .toISOString()
  .split("T")[0];

let chartInstance = null;
let updateInterval = null;

async function fetchGarages() {
  const response = await fetch("/api/garages");
  const garages = await response.json();
  const select = document.getElementById("garage-select");

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Wählen Sie eine Parkgarage";
  emptyOption.disabled = true;
  emptyOption.selected = true;
  select.appendChild(emptyOption);

  garages.forEach((garage) => {
    const option = document.createElement("option");
    option.value = garage.id;
    option.textContent = garage.name;
    select.appendChild(option);
  });

  const hash = window.location.hash.substring(1);
  if (hash && garages.find((garage) => garage.id === Number(hash))) {
    select.value = hash;
    updateChart();
  }
}

async function fetchData(id, date, offset = 0) {
  const end = new Date(date).getTime() - offset + 24 * 60 * 60 * 1000;
  const start = new Date(end - 24 * 60 * 60 * 1000).getTime();
  const response = await fetch(`/api/data/${id}?start=${start}&end=${end}`);
  const { data } = await response.json();
  return data;
}

function renderChart(data, comparisonData = {}) {
  const ctx = document.getElementById("parking-chart").getContext("2d");
  const labels = data.map((entry) => entry.updated_at);
  const values = data.map((entry) => entry.free_capacity);
  const datasets = [
    {
      label: "Verfügbare Plätze",
      data: values,
      borderColor: "rgba(75, 192, 192, 1)",
      borderWidth: 1,
    },
  ];

  if (comparisonData.yesterday) {
    datasets.push({
      label: "Gestern",
      data: comparisonData.yesterday.map((entry) => entry.free_capacity),
      borderColor: "rgba(192, 75, 75, 1)",
      borderWidth: 1,
      borderDash: [5, 5],
    });
  }

  if (comparisonData.lastWeek) {
    datasets.push({
      label: "Letzte Woche",
      data: comparisonData.lastWeek.map((entry) => entry.free_capacity),
      borderColor: "rgba(75, 75, 192, 1)",
      borderWidth: 1,
      borderDash: [5, 5],
    });
  }

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets = datasets;
    chartInstance.update();
  } else {
    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: datasets,
      },
      options: {
        scales: {
          x: {
            type: "time",
            time: {
              unit: "hour",
            },
          },
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }
}

async function updateChart() {
  const garageId = document.getElementById("garage-select").value;
  const date = document.getElementById("date-select").value;
  if (garageId) {
    window.location.hash = garageId;

    const data = await fetchData(garageId, date);
    const comparisonData = {};
    if (document.getElementById("show-yesterday").checked) {
      comparisonData.yesterday = await fetchData(
        garageId,
        date,
        24 * 60 * 60 * 1000
      );
    }
    if (document.getElementById("show-last-week").checked) {
      comparisonData.lastWeek = await fetchData(
        garageId,
        date,
        7 * 24 * 60 * 60 * 1000
      );
    }
    renderChart(data, comparisonData);

    // Clear any existing interval
    if (updateInterval) {
      clearInterval(updateInterval);
    }

    // Set interval to update data every 5 minutes
    updateInterval = setInterval(async () => {
      const newData = await fetchData(garageId, date);
      renderChart(newData, comparisonData);
    }, 300000); // 300000 ms = 5 minutes
  }
}

document
  .getElementById("garage-select")
  .addEventListener("change", updateChart);

document.getElementById("date-select").addEventListener("change", updateChart);

document
  .getElementById("show-yesterday")
  .addEventListener("change", updateChart);

document
  .getElementById("show-last-week")
  .addEventListener("change", updateChart);

fetchGarages();
