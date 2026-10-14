# Tesla Energy - Megapack 2XL Utility-Scale Energy Storage System Specification

## 1. Product Overview & System Architecture
The Megapack 2XL is an integrated, utility-scale battery energy storage system designed for renewable firming, peak shaving, and grid frequency regulation.
- **Energy Capacity**: Up to **3.916 MWh** (Megawatt-hours) per unit.
- **Power Rating**: 1.958 MW (2-hour duration discharge) or 979 kW (4-hour duration discharge).
- **Nominal AC Voltage**: 480V three-phase at 50/60 Hz with internal medium-voltage step-up transformer integration up to 34.5 kV.

## 2. Battery Cell Chemistry & Safety
- **Cell Chemistry**: Lithium Iron Phosphate (**LFP** / LiFePO4).
- **Thermal Runaway Prevention**: LFP chemistry provides superior thermal stability and virtually eliminates oxygen release during cell breakdown, preventing cascaded thermal runaway.
- **Thermal Management**: Liquid-cooled thermal management loop using a dedicated glycol-water closed system maintaining cell temperature variations within **±1.5°C**.

## 3. Efficiency & Operating Performance
- **Round-Trip System Efficiency (RTE)**: **92.0%** at 0.5C charging/discharging rate at the AC interconnect level.
- **Operating Temperature Range**: -30°C to +50°C with full nominal performance without auxiliary derating up to +40°C.
- **Noise Emissions**: Less than **65 dBA** at 10 meters at full cooling output.

## 4. Software & Cloud Telemetry Interface
- Integrated with Tesla Powerhub autonomous dispatch software and SCADA integration via Modbus TCP and DNP3.
- Firmware updates and telemetry data logs are transmitted securely via encrypted cellular and satellite uplinks with dual-homed redundant connections.
