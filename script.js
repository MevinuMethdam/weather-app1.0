// API Key
const apiKey = "dc4704bff273db7a02a4fd9370db7acf";

// DOM Elements
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const headerCityName = document.getElementById("headerCityName");
const weatherIcon = document.getElementById("weatherIcon");
const temperature = document.getElementById("temperature");
const description = document.getElementById("description");
const feelsLike = document.getElementById("feelsLike");
const windSpeed = document.getElementById("windSpeed");
const windArrow = document.getElementById("wind-arrow");
const windDirectionText = document.getElementById("wind-direction-text");
const aqiDisplay = document.getElementById("aqi");
const aqiIcon = document.getElementById("aqi-icon");
const sunriseElement = document.getElementById("sunrise");
const sunriseIcon = document.getElementById("sunrise-icon");
const sunsetElement = document.getElementById("sunset");
const sunsetIcon = document.getElementById("sunset-icon");
const pressureElement = document.getElementById("pressure");
const pressureIcon = document.getElementById("pressure-icon");
const hourlyItemsContainer = document.getElementById("hourlyItems");
const forecastItemsContainer = document.getElementById("forecastItems");
const loadingOverlay = document.getElementById("loadingOverlay");
const themeBadge = document.getElementById("themeBadge");

// Event Listeners
searchBtn.addEventListener("click", handleSearch);
cityInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") handleSearch();
});

function handleSearch() {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherAndForecast(city);
        cityInput.blur();
    } else {
        showToast("Please enter a city name", "error");
    }
}

async function getWeatherAndForecast(city) {
    showLoading(true);

    try {
        // 1. Get Current Weather
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
        const currentRes = await fetch(currentUrl);
        const currentData = await currentRes.json();

        if (currentData.cod !== 200) {
            throw new Error(currentData.message);
        }

        // Update UI with Current Data
        updateCurrentWeatherUI(currentData);
        
        const { lat, lon } = currentData.coord;

        // 2. Parallel Fetch for AQI and Forecast
        const [airRes, forecastRes] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`)
        ]);

        const airData = await airRes.json();
        const forecastData = await forecastRes.json();

        if (airData.list && airData.list.length > 0) {
            updateAqiUI(airData.list[0].main.aqi);
        }

        if (forecastData.cod === "200") {
            updateForecastUI(forecastData.list);
        }

        showToast(`Weather updated for ${currentData.name}`, "success");

    } catch (error) {
        console.error(error);
        showToast(error.message || "Something went wrong!", "error");
    } finally {
        showLoading(false);
    }
}

function updateCurrentWeatherUI(data) {
    headerCityName.textContent = data.name;
    description.textContent = data.weather[0].description;
    
    animateCountUp(temperature, data.main.temp, "°C");
    animateCountUp(feelsLike, data.main.feels_like, "°C", "Feels like: ");
    
    updateHumidityRing(data.main.humidity);
    
    // Wind
    windSpeed.textContent = `${Math.round(data.wind.speed)} km/h`;
    const windDeg = data.wind.deg;
    windArrow.style.transform = `rotate(${windDeg}deg)`;
    windDirectionText.textContent = getWindDirection(windDeg);

    // Sun & Pressure
    sunriseElement.textContent = formatTime(data.sys.sunrise);
    sunsetElement.textContent = formatTime(data.sys.sunset);
    pressureElement.textContent = `${data.main.pressure} hPa`;

    // Icons - FIXED: Using Animated icons for sun, Material icon for pressure
    sunriseIcon.innerHTML = `<img src="${getAnimatedIcon('01d')}" alt="Sunrise">`;
    sunsetIcon.innerHTML = `<img src="${getAnimatedIcon('01n')}" alt="Sunset">`;
    
    // FIXED: Using Material Icon for Pressure
    pressureIcon.innerHTML = `<span class="material-icons">speed</span>`;

    // Main Icon & Theme
    const iconCode = data.weather[0].icon;
    weatherIcon.src = getAnimatedIcon(iconCode);
    weatherIcon.style.display = "block";
    
    setDynamicBackground(data.weather[0].main, iconCode);
    updateDayNightBadge(iconCode);
}

function updateForecastUI(list) {
    hourlyItemsContainer.innerHTML = "";
    forecastItemsContainer.innerHTML = "";

    // Hourly
    list.slice(0, 8).forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "hourly-item";
        div.style.animation = `fadeInUp 0.5s ease forwards ${index * 0.1}s`;
        div.innerHTML = `
            <p>${formatTime(item.dt)}</p>
            <img src="${getAnimatedIcon(item.weather[0].icon)}" style="width:40px;height:40px;">
            <p>${Math.round(item.main.temp)}°C</p>
        `;
        hourlyItemsContainer.appendChild(div);
    });

    // Daily
    const dailyData = list.filter(item => item.dt_txt.includes("12:00:00")).slice(0, 5);
    dailyData.forEach((item, index) => {
        const date = new Date(item.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const div = document.createElement("div");
        div.className = "forecast-item";
        div.style.animation = `fadeInUp 0.5s ease forwards ${index * 0.1}s`;
        div.innerHTML = `
            <p>${dayName}</p>
            <img src="${getAnimatedIcon(item.weather[0].icon)}" style="width:40px;height:40px;">
            <p>${Math.round(item.main.temp)}°C</p>
        `;
        forecastItemsContainer.appendChild(div);
    });
}

function updateAqiUI(aqiValue) {
    const labels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];
    const colors = ["#00e676", "#ffea00", "#ff9100", "#ff3d00", "#bf360c"];
    
    const idx = Math.max(1, Math.min(5, aqiValue)) - 1;
    
    aqiDisplay.innerHTML = `<span style="color:${colors[idx]}">${labels[idx]}</span>`;
    
    // FIXED: Using Material Icon for Air Quality
    aqiIcon.innerHTML = `<span class="material-icons">air</span>`;
}

// --- Utility Functions ---

function showLoading(isLoading) {
    if (isLoading) loadingOverlay.classList.remove("hidden");
    else loadingOverlay.classList.add("hidden");
}

function showToast(message, type = "success") {
    const toastBox = document.getElementById("toastBox");
    const toast = document.createElement("div");
    toast.classList.add("toast", type);
    toast.innerHTML = `
        <span class="material-icons">${type === 'error' ? 'error' : 'check_circle'}</span>
        ${message}
    `;
    toastBox.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function setDynamicBackground(weatherMain, iconCode) {
    const bg = document.getElementById("dynamicBg");
    const isNight = iconCode.includes('n');
    let gradient = "";

    if (isNight) {
        gradient = "radial-gradient(circle at 50% 50%, #1a2a3a, #000)";
    } else {
        const lower = weatherMain.toLowerCase();
        if (lower.includes("clear")) gradient = "radial-gradient(circle at 50% 0%, #ffeb3b, #4facfe)";
        else if (lower.includes("cloud")) gradient = "radial-gradient(circle at 50% 50%, #90a4ae, #cfd8dc)";
        else if (lower.includes("rain")) gradient = "radial-gradient(circle at 50% 50%, #37474f, #455a64)";
        else gradient = "radial-gradient(circle at 50% 0%, #4facfe, #00f2fe)";
    }
    bg.style.background = gradient;
}

function updateHumidityRing(value) {
    const ring = document.getElementById('humRing');
    const text = document.getElementById('humidity');
    const circumference = 2 * Math.PI * 52; 
    const offset = circumference - (value / 100) * circumference;
    
    ring.style.strokeDasharray = `${circumference}`;
    ring.style.strokeDashoffset = `${offset}`;
    text.textContent = `${value}%`;
}

function animateCountUp(el, target, suffix = "", prefix = "") {
    const start = 0;
    const duration = 1000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 4);
        const currentVal = Math.floor(start + (target - start) * ease);
        el.textContent = `${prefix}${currentVal}${suffix}`;
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
    });
}

function getWindDirection(deg) {
    const sectors = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return sectors[Math.round(deg / 45) % 8];
}

function updateDayNightBadge(iconCode) {
    const isDay = iconCode.includes('d');
    themeBadge.dataset.theme = isDay ? "Day" : "Night";
    themeBadge.querySelector(".theme-text").textContent = isDay ? "Day Mode" : "Night Mode";
    themeBadge.querySelector(".theme-icon").textContent = isDay ? "light_mode" : "dark_mode";
}

function updateLocalTime() {
    const now = new Date();
    document.getElementById('localTime').textContent = now.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
}
setInterval(updateLocalTime, 1000);
updateLocalTime();

function getAnimatedIcon(code) {
    const map = {
        "01d": "day", "01n": "night",
        "02d": "cloudy-day-1", "02n": "cloudy-night-1",
        "03d": "cloudy", "03n": "cloudy",
        "04d": "cloudy", "04n": "cloudy",
        "09d": "rainy-4", "09n": "rainy-4",
        "10d": "rainy-1", "10n": "rainy-5",
        "11d": "thunder", "11n": "thunder",
        "13d": "snowy-3", "13n": "snowy-5",
        "50d": "mist", "50n": "mist"
    };
    const name = map[code] || "weather";
    return `https://www.amcharts.com/wp-content/themes/amcharts4/css/img/icons/weather/animated/${name}.svg`;
}

window.addEventListener("load", () => getWeatherAndForecast("Kothalawala"));