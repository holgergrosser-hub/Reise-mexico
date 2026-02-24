// ============================================
// WETTER API SERVICE
// OpenWeatherMap für Wettervorhersagen
// ============================================

const WEATHER_API_KEY = 'c85696ce3595b1d2325a570c62e612c0'; // Kostenlos auf openweathermap.org
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5';

class WeatherAPI {
  constructor() {
    this.apiKey = WEATHER_API_KEY;
  }

  // Aktuelles Wetter abrufen
  async getCurrentWeather(city = 'Mexico City') {
    try {
      const response = await fetch(
        `${WEATHER_API_URL}/weather?q=${city},MX&appid=${this.apiKey}&units=metric&lang=de`
      );
      
      if (!response.ok) {
        throw new Error('Wetter konnte nicht geladen werden');
      }
      
      const data = await response.json();
      return {
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        humidity: data.main.humidity,
        wind: data.wind.speed
      };
    } catch (error) {
      console.error('Wetter-Fehler:', error);
      return null;
    }
  }

  // 5-Tage Vorhersage (3h Intervalle)
  async getForecast(city = 'Mexico City') {
    try {
      const response = await fetch(
        `${WEATHER_API_URL}/forecast?q=${city},MX&appid=${this.apiKey}&units=metric&lang=de`
      );
      
      if (!response.ok) {
        throw new Error('Vorhersage konnte nicht geladen werden');
      }
      
      const data = await response.json();
      
      // Gruppiere nach Tagen
      const dailyForecasts = {};
      data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString('de-DE');
        if (!dailyForecasts[date]) {
          dailyForecasts[date] = {
            date: date,
            temp: [],
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            rain: item.rain?.['3h'] || 0
          };
        }
        dailyForecasts[date].temp.push(item.main.temp);
      });
      
      // Berechne Durchschnittstemperatur pro Tag
      const forecast = Object.values(dailyForecasts).map(day => ({
        ...day,
        tempMin: Math.round(Math.min(...day.temp)),
        tempMax: Math.round(Math.max(...day.temp)),
        tempAvg: Math.round(day.temp.reduce((a, b) => a + b, 0) / day.temp.length)
      }));
      
      return forecast.slice(0, 5); // Erste 5 Tage
    } catch (error) {
      console.error('Vorhersage-Fehler:', error);
      return [];
    }
  }

  // Wetter für spezifisches Datum
  async getWeatherForDate(date, city = 'Mexico City') {
    const forecast = await this.getForecast(city);
    const targetDate = new Date(date).toLocaleDateString('de-DE');
    
    const dayForecast = forecast.find(f => f.date === targetDate);
    return dayForecast || null;
  }

  // Wetter-Icon URL
  getIconUrl(iconCode) {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  // Wetter-Empfehlung
  getWeatherAdvice(weather) {
    if (!weather) return '';
    
    const temp = weather.temp || weather.tempAvg;
    const desc = weather.description.toLowerCase();
    
    let advice = [];
    
    if (temp > 30) {
      advice.push('☀️ Sehr warm - Sonnenschutz & viel Wasser!');
    } else if (temp > 25) {
      advice.push('🌤️ Angenehm warm - leichte Kleidung');
    } else if (temp < 15) {
      advice.push('🧥 Kühl - Jacke mitnehmen');
    }
    
    if (desc.includes('regen') || desc.includes('rain')) {
      advice.push('☔ Regenschirm empfohlen');
    }
    
    if (weather.humidity > 80) {
      advice.push('💧 Hohe Luftfeuchtigkeit');
    }
    
    return advice.join(' • ');
  }
}

export default WeatherAPI;
