import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Pie } from 'react-chartjs-2';
import { ClipLoader } from 'react-spinners';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ArcElement,
} from 'chart.js';
import 'chartjs-adapter-moment';
import './App.css'; // Import a CSS file for additional styling

import Login from './login';
import Signup from './signup';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ArcElement
);

const API_URL = 'http://127.0.0.1:8000/api';

// Define available currency pairs
const availablePairs = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "NZDUSD", "USDCAD", 
  "EURGBP", "EURJPY", "EURCHF", "EURAUD", "EURNZD", "EURCAD", "GBPJPY", 
  "GBPCHF", "GBPAUD", "GBPNZD", "GBPCAD", "CHFJPY", "AUDJPY", "AUDCHF", 
  "AUDNZD", "AUDCAD", "NZDJPY", "CADCHF", "CADJPY", "XAGUSD", "XAUUSD", 
  "NZDCAD", "NZDCHF", "EURHUF", "EURNOK", "EURPLN", "EURSEK", "EURTRY", 
  "USDDKK", "USDCZK", "USDMXN", "USDHUF", "USDNOK", "USDPLN", "USDSEK", 
  "EURHKD", "USDSGD", "SGDJPY", "USDHKD", "USDCNH", "USDTRY", "EURMXN", 
  "GBPMXN", "USDZAR", "EURZAR", "GBPZAR", "ZARJPY"
];

const baseCurrencies = [...new Set(availablePairs.map(pair => pair.slice(0, 3)))];

const algorithmNames = [
  "Quantum Trend Analysis",
  "Neural Network Predictor",
  "Genetic Algorithm Forecast",
  "Stochastic Gradient Descent",
  "Bayesian Inference Model",
  "Support Vector Machine",
  "Random Forest Estimator",
  "Deep Learning Sequence"
];

function App() {
  const [options, setOptions] = useState({ intervals: {} });
  const [formData, setFormData] = useState({
    baseCurrency: baseCurrencies[0],
    quoteCurrency: '',
    interval: '',
  });
  const [chartsData, setChartsData] = useState({});
  const [messages, setMessages] = useState({});
  const [trendCounts, setTrendCounts] = useState({});
  const [majorityMessage, setMajorityMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [filteredQuoteCurrencies, setFilteredQuoteCurrencies] = useState([]);
  const [view, setView] = useState(localStorage.getItem('isLoggedIn') ? 'main' : 'login');
   
  const handleLogin = () => {
    // Simulate authentication logic
    localStorage.setItem('isLoggedIn', 'true'); // Save login state
    setView('main'); // Change view to main
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://127.0.0.1:8000/api/logout/');
      localStorage.removeItem('isLoggedIn'); // Clear login state
      setView('login'); // Redirect to login
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (formData.baseCurrency) {
      const newFilteredQuoteCurrencies = availablePairs
        .filter(pair => pair.startsWith(formData.baseCurrency))
        .map(pair => pair.slice(3));
      setFilteredQuoteCurrencies(newFilteredQuoteCurrencies);
      setFormData(prevState => ({
        ...prevState,
        quoteCurrency: newFilteredQuoteCurrencies[0]
      }));
    }
  }, [formData.baseCurrency]);

  const fetchOptions = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-options/`);
      setOptions(response.data);
      setFormData(prevState => ({
        ...prevState,
        interval: Object.keys(response.data.intervals)[0],
      }));
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ticker = `${formData.baseCurrency}${formData.quoteCurrency}`;
      const response = await axios.post(`${API_URL}/get-rates/`, { ticker, interval: formData.interval });
      const data = response.data;

      const newChartsData = {};
      const newMessages = {};
      const newTrendCounts = { uptrend: 0, downtrend: 0, neutral: 0 };

      Object.keys(data).forEach((key, index) => {
        if (key === 'majority_trend' || key === 'majority_message') return;

        const historical = data[key].historical;
        const predicted = data[key].predicted;
        const label = algorithmNames[index % algorithmNames.length];

        const chartData = {
          labels: [...historical.map(h => new Date(h[0] * 1000)), ...predicted.map(p => new Date(p[0] * 1000))],
          datasets: [
            {
              label: 'Historical Prices',
              data: historical.map(h => h[1]),
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
            },
            {
              label: 'Predicted Prices',
              data: [...Array(historical.length).fill(null), ...predicted.map(p => p[1])],
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderDash: [5, 5],
            },
          ],
        };

        newChartsData[label] = chartData;
        newMessages[label] = data[key].message;
        newTrendCounts[data[key].trend] += 1;
      });

      setChartsData(newChartsData);
      setMessages(newMessages);
      setTrendCounts(newTrendCounts);
      setMajorityMessage(data.majority_message);
    } catch (error) {
      console.error('Error fetching rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeUnit = (interval) => {
    switch (interval) {
      case 'Within 2 days':
      case 'Within 2-4 days':
      case 'Within 4-7 days':
      case 'Within 1-2 Week':
        return 'minute';
      case 'Within 2-3 Week':
      case 'Within 1 Month':
        return 'hour';
      case 'Within 2 Months':
        return 'day';
      case 'Within 4 Months':
        return 'week';
      case 'Within 4-12 Months':
        return 'month';
      default:
        return 'day';
    }
  };

  const renderCharts = () => {
    return Object.keys(chartsData).map((key, index) => (
      <div key={index} className="w-full md:w-1/2 lg:w-1/3 xl:w-1/4 p-4">
        <div className="card bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">{key}</h2>
          <div className="chart-container">
            <Line
              data={chartsData[key]}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    type: 'time',
                    time: {
                      unit: getTimeUnit(formData.interval),
                      tooltipFormat: 'll HH:mm',
                      displayFormats: {
                        minute: 'HH:mm',
                        hour: 'MMM D, HH:mm',
                        day: 'MMM D',
                        week: 'MMM D',
                        month: 'MMM YYYY',
                      },
                    },
                    title: {
                      display: true,
                      text: 'Date',
                    },
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Price',
                    },
                    beginAtZero: false,
                  },
                },
              }}
            />
          </div>
          <div className="mt-4 text-base font-medium">
            {messages[key]}
          </div>
        </div>
      </div>
    ));
  };

  const renderPieChart = () => {
    const data = {
      labels: ['Uptrend', 'Downtrend', 'Neutral'],
      datasets: [
        {
          data: [trendCounts.uptrend, trendCounts.downtrend, trendCounts.neutral],
          backgroundColor: ['#4BC0C0', '#FF6384', '#FFCE56'],
          hoverBackgroundColor: ['#36A2EB', '#FF6384', '#FFCE56'],
        },
      ],
    };

    return (
      <div className="w-full md:w-1/2 lg:w-1/3 xl:w-1/4 p-4">
        <div className="card bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Trend Analysis</h2>
          <div className="chart-container">
            <Pie data={data} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="App p-1 max-w-6xl mx-auto">
       {view === 'login' && (
        <>
          <Login onLogin={handleLogin} />
          <div className="flex justify-center mt-0">
            <button onClick={() => setView('signup')} className="mx-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition duration-200">Signup</button>
          </div>
        </>
      )}
      {view === 'signup' && (
        <>
          <Signup onSignup={handleLogin} /> 
          <div className="flex justify-center mt-0">
            <button onClick={() => setView('login')} className="mx-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition duration-200">Login</button>
          </div>
        </>
      )}
      {view === 'main' && (
        <>
           <div className="header-container"> {/* Flex container */}
        <h1 className="text-3xl font-bold mb-6">Forex Prediction</h1>
        <button onClick={handleLogout} className="logout-button ml-auto">
          Logout
        </button>
      </div>
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-lg font-medium mb-2">Base Currency:</label>
                <select
                  name="baseCurrency"
                  value={formData.baseCurrency}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {baseCurrencies.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-medium mb-2">Quote Currency:</label>
                <select
                  name="quoteCurrency"
                  value={formData.quoteCurrency}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {filteredQuoteCurrencies.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-medium mb-2">Interval:</label>
                <select
                  name="interval"
                  value={formData.interval}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {Object.keys(options.intervals).map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition duration-200">Get Rates</button>
              </div>
            </form>
          </div>
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <ClipLoader size={150} color={"#123abc"} loading={loading} />
              <div className="mt-4 text-lg font-medium">Analyzing...</div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap -m-4">
                {renderCharts()}
                {renderPieChart()}
              </div>
              {majorityMessage && (
                <div className="mt-6 text-xl font-semibold text-center">
                  {majorityMessage}
                </div>
              )}
            </>
          )}
        </>
      )}

      

    </div>
  );
}

export default App;
