import React, { useState } from 'react';
import { 
  Layers, 
  Cpu, 
  Radio, 
  Gauge, 
  Zap, 
  CheckCircle2, 
  ChevronRight,
  Info,
  Maximize2,
  ExternalLink
} from 'lucide-react';

interface SensorInfo {
  id: string;
  name: string;
  category: string;
  model: string;
  image: string;
  shortDesc: string;
  hindiSummary: string;
  specs: Array<{ label: string; value: string }>;
  pins: Array<{ pin: string; function: string }>;
  missionRole: string;
}

const sensorsData: SensorInfo[] = [
  {
    id: 'bmp280',
    name: 'BMP280 Barometric Pressure & Altitude Sensor',
    category: 'ALTIMETER & THERMAL',
    model: 'Bosch Sensortec BMP280',
    image: '/src/assets/images/sensor_bmp280_1793180989939.jpg',
    shortDesc: 'High-precision digital atmospheric pressure and altitude sensor used for real-time height tracking and apogee detection.',
    hindiSummary: 'Yeh sensor CanSat ki real-time altitude (unchai) aur barometric pressure measure karta hai. Iska use apogee (highest point) detect karke parachute deploy karne ke liye hota hai.',
    specs: [
      { label: 'Pressure Range', value: '300 to 1100 hPa (+9000m to -500m)' },
      { label: 'Altitude Precision', value: '±1 meter relative resolution' },
      { label: 'Temperature Sensor', value: '-40°C to +85°C (±0.5°C accuracy)' },
      { label: 'Communication', value: 'I2C (0x76 / 0x77) & SPI' },
      { label: 'Operating Voltage', value: '1.8V to 3.6V (3.3V typical)' },
      { label: 'Current Consumption', value: '2.7 µA @ 1 Hz sampling' },
    ],
    pins: [
      { pin: 'VCC', function: '3.3V DC Power Supply' },
      { pin: 'GND', function: 'Ground 0V' },
      { pin: 'SCL', function: 'I2C Clock Line (Connect to ESP32 D22 / A5)' },
      { pin: 'SDA', function: 'I2C Data Line (Connect to ESP32 D21 / A4)' },
      { pin: 'CSB', function: 'Chip Select (Pull high for I2C)' },
      { pin: 'SDO', function: 'Address select (GND=0x76, VCC=0x77)' },
    ],
    missionRole: 'Calculates instantaneous altitude above sea level (MSL) and above ground level (AGL). When descent is detected, triggers parachute servo ejection mechanism.',
  },
  {
    id: 'mpu6050',
    name: 'MPU-6050 6-Axis Motion Tracking IMU',
    category: 'INERTIAL & ATTITUDE',
    model: 'InvenSense MPU-6050 (GY-521 Breakout)',
    image: '/src/assets/images/sensor_mpu6050_1793181006324.jpg',
    shortDesc: '6-DoF inertial measurement unit combining a 3-axis gyroscope and a 3-axis accelerometer with internal Digital Motion Processor (DMP).',
    hindiSummary: 'Yeh 6-Axis IMU sensor CanSat ke 3D orientation (Pitch, Roll, Yaw) aur launch ke dauran lagne wale G-force acceleration ko live track karta hai.',
    specs: [
      { label: 'Gyroscope Range', value: '±250, ±500, ±1000, ±2000 °/sec' },
      { label: 'Accelerometer Range', value: '±2g, ±4g, ±8g, ±16g' },
      { label: 'Onboard DMP', value: 'Hardware sensor fusion for Euler angles' },
      { label: 'Communication', value: 'I2C Bus (Default Address 0x68)' },
      { label: 'Operating Voltage', value: '3.3V - 5.0V (Onboard LDO regulator)' },
      { label: 'Sampling Rate', value: 'Programmable up to 1 kHz' },
    ],
    pins: [
      { pin: 'VCC', function: '3.3V or 5V Power Supply' },
      { pin: 'GND', function: 'Ground connection' },
      { pin: 'SCL', function: 'I2C Serial Clock' },
      { pin: 'SDA', function: 'I2C Serial Data' },
      { pin: 'XDA / XCL', function: 'Auxiliary I2C for external magnetometer' },
      { pin: 'INT', function: 'Motion interrupt pin for freefall / apogee' },
    ],
    missionRole: 'Renders the 3D Attitude Gimbal on the ground station HUD and calculates stabilizing aerodynamic drag during high-velocity descent.',
  },
  {
    id: 'neo6m',
    name: 'u-blox NEO-6M High-Sensitivity GPS Module',
    category: 'NAVIGATION & RECOVERY',
    model: 'u-blox NEO-6M-0-001 with Ceramic Patch Antenna',
    image: '/src/assets/images/sensor_neo6m_gps_1793181006873.jpg',
    shortDesc: 'Complete standalone GPS receiver with high RF sensitivity ceramic patch antenna and onboard EEPROM for coordinate memory.',
    hindiSummary: 'Yeh GPS module satellite se connect hokar CanSat ki exact Latitude, Longitude aur unchai batata hai taaki touchdown ke baad team aasaani se CanSat khoj sake.',
    specs: [
      { label: 'Receiver Engine', value: '50-channel u-blox 6 positioning engine' },
      { label: 'Tracking Sensitivity', value: '-161 dBm SuperSense' },
      { label: 'Time-To-First-Fix', value: 'Cold start: 27s · Hot start: 1s' },
      { label: 'Update Rate', value: '1 Hz to 5 Hz configurable' },
      { label: 'Interface', value: 'UART Serial (9600 baud standard NMEA)' },
      { label: 'Antenna', value: '25x25mm active ceramic patch with SMA connector' },
    ],
    pins: [
      { pin: 'VCC', function: '3.3V to 5V DC supply' },
      { pin: 'GND', function: 'Ground 0V' },
      { pin: 'TX', function: 'UART Transmit (Sends $GPGGA, $GPRMC packets)' },
      { pin: 'RX', function: 'UART Receive (Configuration commands)' },
      { pin: 'PPS', function: 'Pulse-Per-Second precision time strobe' },
    ],
    missionRole: 'Plots the real-time ground track on the radar screen and provides GPS coordinates for the recovery search party at MMMUT Gorakhpur.',
  },
  {
    id: 'esp32',
    name: 'ESP32 Dual-Core 240MHz Wi-Fi & BLE Flight Microcontroller',
    category: 'FLIGHT COMPUTER & WIRELESS CORE',
    model: 'Espressif Systems ESP32-WROOM-32 (NodeMCU-32S DevKit)',
    image: '/src/assets/images/sensor_esp32_soc_1793185476796.jpg',
    shortDesc: 'High-performance 32-bit dual-core Xtensa LX6 SoC with integrated 2.4 GHz Wi-Fi and Bluetooth. Serves as CanSat master flight computer orchestrating all avionics and data routing.',
    hindiSummary: 'Yeh CanSat ka main flight computer (dimaag) hai. Dual-core 240MHz processor sabhi sensors (BMP280, MPU6050, DHT11, GPS) ka data process karta hai, parachute servo control karta hai aur telemetry ground station ko bhejta hai.',
    specs: [
      { label: 'Processor Core', value: 'Xtensa Dual-Core 32-bit LX6 @ 240 MHz (600 DMIPS)' },
      { label: 'SRAM & Flash', value: '520 KB internal SRAM · 4 MB SPI Flash memory' },
      { label: 'Wireless Link', value: '2.4 GHz 802.11 b/g/n Wi-Fi (150 Mbps) + BLE v4.2' },
      { label: 'Serial & Bus Peripherals', value: '3x UART, 2x I2C (400kHz fast mode), 3x SPI, 16x PWM' },
      { label: 'Analog-to-Digital', value: '18-channel 12-bit SAR ADC with attenuation' },
      { label: 'Operating Voltage', value: '3.3V logic (onboard 5V AMS1117 regulator / Micro-USB)' },
    ],
    pins: [
      { pin: 'VIN / 5V', function: '5V DC Power Input from 2S battery buck regulator' },
      { pin: '3V3', function: 'Regulated 3.3V power output to BMP280, MPU6050, DHT11' },
      { pin: 'GND', function: 'Common Ground 0V' },
      { pin: 'GPIO 21 / 22', function: 'Hardware I2C lines: SDA (21) & SCL (22)' },
      { pin: 'GPIO 16 / 17', function: 'Hardware UART2 lines: RX2 (16) & TX2 (17) for NEO-6M GPS' },
      { pin: 'GPIO 4', function: 'Single-wire bidirectional DATA line for DHT11 sensor' },
      { pin: 'GPIO 18', function: 'PWM signal pin for Parachute Ejection Servo' },
    ],
    missionRole: 'Heart of the avionics bay. Samples atmospheric and navigation sensors at 2-10 Hz, executes attitude estimation filters, streams telemetry over USB serial UART & Wi-Fi UDP, and fires parachute deployment logic at apogee.',
  },
  {
    id: 'dht11',
    name: 'DHT11 Digital Relative Humidity & Ambient Temperature Sensor',
    category: 'ATMOSPHERIC METEOROLOGY',
    model: 'Aosong DHT11 Capacitive & NTC Composite Sensor Breakout',
    image: '/src/assets/images/sensor_dht11_temp_1793185490493.jpg',
    shortDesc: 'Single-bus digital temperature and relative humidity sensor with factory calibration. Captures atmospheric moisture profiles during CanSat ascent and parachute descent.',
    hindiSummary: 'Yeh sensor CanSat ke atmospheric test bay me lagaya gaya hai. Flight ke dauran troposphere ki nami (humidity % RH) aur taapman (temperature °C) accurate digital signal me deliver karta hai.',
    specs: [
      { label: 'Humidity Measurement Range', value: '20% to 90% RH' },
      { label: 'Humidity Accuracy', value: '±5.0% RH @ 25°C' },
      { label: 'Temperature Range', value: '0°C to +50°C' },
      { label: 'Temperature Accuracy', value: '±2.0°C' },
      { label: 'Data Resolution', value: '8-bit digital (1% RH, 1°C step)' },
      { label: 'Communication Protocol', value: 'Single-wire bidirectional serial bus with 40-bit data packet' },
      { label: 'Sampling Interval', value: '1 Hz (1 reading per second)' },
      { label: 'Operating Voltage', value: '3.3V to 5.5V DC (3.3V safe for ESP32 GPIO)' },
    ],
    pins: [
      { pin: 'VCC', function: '3.3V or 5V logic supply' },
      { pin: 'DATA', function: 'Single-bus digital bidirectional signal (connected to ESP32 GPIO 4)' },
      { pin: 'NC / GND', function: 'Ground 0V / Return line' },
    ],
    missionRole: 'Records the atmospheric boundary layer humidity gradient and dew point potential during flight, establishing real-time weather and troposphere humidity profiles above MMMUT Gorakhpur launch grounds.',
  },
];

export const SensorShowcaseView: React.FC = () => {
  const [selectedSensor, setSelectedSensor] = useState<SensorInfo>(sensorsData[0]);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                ORBITRA ’26 CANSAT SENSOR SUITE & HARDWARE PAYLOAD
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-mono text-slate-400">Team Sputnik (MMMUT)</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Photographs, pinouts, and technical specifications of all 5 avionics modules powering our telemetry ground station.
            </p>
          </div>
          <div className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1 rounded shrink-0">
            5 SENSORS ACTIVE
          </div>
        </div>

        {/* Quick Sensor Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 pt-1">
          {sensorsData.map((s) => {
            const isSelected = selectedSensor.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSensor(s)}
                className={`p-2 rounded text-left transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-cyan-950/80 border-cyan-700 text-cyan-200 shadow-sm shadow-cyan-900/20'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <img
                  src={s.image}
                  alt={s.name}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded object-cover border border-slate-700 shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase text-slate-500 truncate">
                    {s.id.toUpperCase()}
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-200 truncate">
                    {s.name.split(' ')[0]}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Selected Sensor Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: High-Res Studio Photo & Quick Specs (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950/90 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-900 text-xs font-mono">
              <span className="text-cyan-400 font-semibold uppercase">{selectedSensor.category}</span>
              <span className="text-slate-500">{selectedSensor.model}</span>
            </div>

            {/* High-res Photo Container */}
            <div className="relative aspect-4/3 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 group">
              <img
                src={selectedSensor.image}
                alt={selectedSensor.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                <span className="text-xs font-mono font-semibold text-white drop-shadow">
                  {selectedSensor.name}
                </span>
              </div>
            </div>

            {/* Hindi / Hinglish Summary Card */}
            <div className="mt-3 p-3 bg-cyan-950/40 border border-cyan-900/60 rounded-md">
              <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase mb-1">
                KYU USE KIYA HAI? (PURPOSE IN CANSAT)
              </div>
              <p className="text-xs font-sans text-cyan-100 leading-relaxed">
                {selectedSensor.hindiSummary}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] font-mono text-slate-500 flex items-center justify-between">
            <span>VERIFIED FOR ORBITRA ’26 FLIGHT</span>
            <span className="text-emerald-400">LAB TESTED</span>
          </div>
        </div>

        {/* Right Column: Detailed Technical Breakdown & Pinouts (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/90 border border-slate-800 rounded-lg p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="pb-2 border-b border-slate-900">
              <h3 className="text-lg font-mono font-bold text-slate-100">
                {selectedSensor.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {selectedSensor.shortDesc}
              </p>
            </div>

            {/* Role in CanSat Mission */}
            <div className="mt-3 p-3 bg-slate-900/60 border border-slate-800 rounded-md">
              <div className="text-[10px] font-mono text-amber-400 font-bold uppercase mb-1">
                ROLE IN MISSION CONTROL & TELEMETRY
              </div>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                {selectedSensor.missionRole}
              </p>
            </div>

            {/* Technical Specifications Grid */}
            <div className="mt-3">
              <div className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider mb-2">
                TECHNICAL SPECIFICATIONS
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {selectedSensor.specs.map((spec, i) => (
                  <div key={i} className="bg-slate-900/50 border border-slate-800 p-2 rounded">
                    <span className="text-slate-500 block text-[10px] uppercase">{spec.label}</span>
                    <span className="text-slate-200 font-medium">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pinout & Wiring Table */}
            <div className="mt-3">
              <div className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider mb-2">
                PINOUT & HARDWARE WIRING (ARDUINO / ESP32)
              </div>
              <div className="overflow-x-auto border border-slate-800 rounded">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-1.5 px-3">PIN</th>
                      <th className="py-1.5 px-3">FUNCTION & CONNECTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {selectedSensor.pins.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="py-1.5 px-3 font-bold text-cyan-400">{p.pin}</td>
                        <td className="py-1.5 px-3 text-slate-300">{p.function}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-xs font-mono text-slate-500">
            <span>TEAM SPUTNIK · AVIONICS SUBSYSTEM</span>
            <span className="text-slate-400">MMMUT GORAKHPUR</span>
          </div>
        </div>
      </div>
    </div>
  );
};
