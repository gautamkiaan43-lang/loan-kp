// Lenni Cost of Credit and Repayment Matrix for Backend
const LOAN_MATRIX = {
  "400": {
    "1": { "interest": 8, "serviceFee": 11, "initFee": 165, "insurance": 0, "totalRepayment": 584, "monthly": 584, "fortnightly": 292, "weekly": 146 },
    "2": { "interest": 16, "serviceFee": 75, "initFee": 165, "insurance": 0, "totalRepayment": 656, "monthly": 328, "fortnightly": 164, "weekly": 82 },
    "3": { "interest": 24, "serviceFee": 143, "initFee": 165, "insurance": 0, "totalRepayment": 732, "monthly": 244, "fortnightly": 122, "weekly": 61 },
    "4": { "interest": 32, "serviceFee": 155, "initFee": 165, "insurance": 0, "totalRepayment": 752, "monthly": 188, "fortnightly": 94, "weekly": 47 },
    "5": { "interest": 40, "serviceFee": 175, "initFee": 165, "insurance": 0, "totalRepayment": 780, "monthly": 156, "fortnightly": 78, "weekly": 39 },
    "6": { "interest": 48, "serviceFee": 179, "initFee": 165, "insurance": 0, "totalRepayment": 792, "monthly": 132, "fortnightly": 66, "weekly": 33 }
  },
  "800": {
    "1": { "interest": 16, "serviceFee": 27, "initFee": 165, "insurance": 0, "totalRepayment": 1008, "monthly": 1008, "fortnightly": 504, "weekly": 252 },
    "2": { "interest": 32, "serviceFee": 99, "initFee": 165, "insurance": 0, "totalRepayment": 1096, "monthly": 548, "fortnightly": 274, "weekly": 137 },
    "3": { "interest": 48, "serviceFee": 163, "initFee": 165, "insurance": 0, "totalRepayment": 1176, "monthly": 392, "fortnightly": 196, "weekly": 98 },
    "4": { "interest": 64, "serviceFee": 171, "initFee": 165, "insurance": 0, "totalRepayment": 1200, "monthly": 300, "fortnightly": 150, "weekly": 75 },
    "5": { "interest": 80, "serviceFee": 175, "initFee": 165, "insurance": 0, "totalRepayment": 1220, "monthly": 244, "fortnightly": 122, "weekly": 61 },
    "6": { "interest": 96, "serviceFee": 187, "initFee": 165, "insurance": 0, "totalRepayment": 1248, "monthly": 208, "fortnightly": 104, "weekly": 52 }
  },
  "1200": {
    "1": { "interest": 24, "serviceFee": 39, "initFee": 185, "insurance": 0, "totalRepayment": 1448, "monthly": 1448, "fortnightly": 724, "weekly": 362 },
    "2": { "interest": 48, "serviceFee": 103, "initFee": 185, "insurance": 0, "totalRepayment": 1536, "monthly": 768, "fortnightly": 384, "weekly": 192 },
    "3": { "interest": 72, "serviceFee": 175, "initFee": 185, "insurance": 0, "totalRepayment": 1632, "monthly": 544, "fortnightly": 272, "weekly": 136 },
    "4": { "interest": 96, "serviceFee": 183, "initFee": 185, "insurance": 0, "totalRepayment": 1664, "monthly": 416, "fortnightly": 208, "weekly": 104 },
    "5": { "interest": 120, "serviceFee": 195, "initFee": 185, "insurance": 0, "totalRepayment": 1700, "monthly": 340, "fortnightly": 170, "weekly": 85 },
    "6": { "interest": 144, "serviceFee": 223, "initFee": 185, "insurance": 0, "totalRepayment": 1752, "monthly": 292, "fortnightly": 146, "weekly": 73 }
  },
  "1600": {
    "1": { "interest": 32, "serviceFee": 39, "initFee": 225, "insurance": 0, "totalRepayment": 1896, "monthly": 1896, "fortnightly": 948, "weekly": 474 },
    "2": { "interest": 64, "serviceFee": 103, "initFee": 225, "insurance": 0, "totalRepayment": 1992, "monthly": 996, "fortnightly": 498, "weekly": 249 },
    "3": { "interest": 96, "serviceFee": 179, "initFee": 225, "insurance": 0, "totalRepayment": 2100, "monthly": 700, "fortnightly": 350, "weekly": 175 },
    "4": { "interest": 128, "serviceFee": 191, "initFee": 225, "insurance": 0, "totalRepayment": 2144, "monthly": 536, "fortnightly": 268, "weekly": 134 },
    "5": { "interest": 160, "serviceFee": 195, "initFee": 225, "insurance": 0, "totalRepayment": 2180, "monthly": 436, "fortnightly": 218, "weekly": 109 },
    "6": { "interest": 192, "serviceFee": 215, "initFee": 225, "insurance": 0, "totalRepayment": 2232, "monthly": 372, "fortnightly": 186, "weekly": 93 }
  },
  "2000": {
    "1": { "interest": 40, "serviceFee": 47, "initFee": 265, "insurance": 0, "totalRepayment": 2352, "monthly": 2352, "fortnightly": 1176, "weekly": 588 },
    "2": { "interest": 80, "serviceFee": 103, "initFee": 265, "insurance": 0, "totalRepayment": 2448, "monthly": 1224, "fortnightly": 612, "weekly": 306 },
    "3": { "interest": 120, "serviceFee": 171, "initFee": 265, "insurance": 0, "totalRepayment": 2556, "monthly": 852, "fortnightly": 426, "weekly": 213 },
    "4": { "interest": 160, "serviceFee": 183, "initFee": 265, "insurance": 0, "totalRepayment": 2608, "monthly": 652, "fortnightly": 326, "weekly": 163 },
    "5": { "interest": 200, "serviceFee": 195, "initFee": 265, "insurance": 0, "totalRepayment": 2660, "monthly": 532, "fortnightly": 266, "weekly": 133 },
    "6": { "interest": 240, "serviceFee": 207, "initFee": 265, "insurance": 0, "totalRepayment": 2712, "monthly": 452, "fortnightly": 226, "weekly": 113 }
  },
  "2400": {
    "1": { "interest": 48, "serviceFee": 47, "initFee": 305, "insurance": 0, "totalRepayment": 2800, "monthly": 2800, "fortnightly": 1400, "weekly": 700 },
    "2": { "interest": 96, "serviceFee": 103, "initFee": 305, "insurance": 0, "totalRepayment": 2904, "monthly": 1452, "fortnightly": 726, "weekly": 363 },
    "3": { "interest": 144, "serviceFee": 163, "initFee": 305, "insurance": 0, "totalRepayment": 3012, "monthly": 1004, "fortnightly": 502, "weekly": 251 },
    "4": { "interest": 192, "serviceFee": 207, "initFee": 305, "insurance": 0, "totalRepayment": 3104, "monthly": 776, "fortnightly": 388, "weekly": 194 },
    "5": { "interest": 240, "serviceFee": 215, "initFee": 305, "insurance": 0, "totalRepayment": 3160, "monthly": 632, "fortnightly": 316, "weekly": 158 },
    "6": { "interest": 288, "serviceFee": 223, "initFee": 305, "insurance": 0, "totalRepayment": 3216, "monthly": 536, "fortnightly": 268, "weekly": 134 }
  },
  "2800": {
    "1": { "interest": 56, "serviceFee": 47, "initFee": 345, "insurance": 0, "totalRepayment": 3248, "monthly": 3248, "fortnightly": 1624, "weekly": 812 },
    "2": { "interest": 112, "serviceFee": 103, "initFee": 345, "insurance": 0, "totalRepayment": 3360, "monthly": 1680, "fortnightly": 840, "weekly": 420 },
    "3": { "interest": 168, "serviceFee": 155, "initFee": 345, "insurance": 0, "totalRepayment": 3468, "monthly": 1156, "fortnightly": 578, "weekly": 289 },
    "4": { "interest": 224, "serviceFee": 199, "initFee": 345, "insurance": 0, "totalRepayment": 3568, "monthly": 892, "fortnightly": 446, "weekly": 223 },
    "5": { "interest": 280, "serviceFee": 215, "initFee": 345, "insurance": 0, "totalRepayment": 3640, "monthly": 728, "fortnightly": 364, "weekly": 182 },
    "6": { "interest": 336, "serviceFee": 239, "initFee": 345, "insurance": 0, "totalRepayment": 3720, "monthly": 620, "fortnightly": 310, "weekly": 155 }
  },
  "3200": {
    "1": { "interest": 64, "serviceFee": 47, "initFee": 385, "insurance": 0, "totalRepayment": 3696, "monthly": 3696, "fortnightly": 1848, "weekly": 924 },
    "2": { "interest": 128, "serviceFee": 103, "initFee": 385, "insurance": 0, "totalRepayment": 3816, "monthly": 1908, "fortnightly": 954, "weekly": 477 },
    "3": { "interest": 192, "serviceFee": 147, "initFee": 385, "insurance": 0, "totalRepayment": 3924, "monthly": 1308, "fortnightly": 654, "weekly": 327 },
    "4": { "interest": 256, "serviceFee": 191, "initFee": 385, "insurance": 0, "totalRepayment": 4032, "monthly": 1008, "fortnightly": 504, "weekly": 252 },
    "5": { "interest": 320, "serviceFee": 195, "initFee": 385, "insurance": 0, "totalRepayment": 4100, "monthly": 820, "fortnightly": 410, "weekly": 205 },
    "6": { "interest": 384, "serviceFee": 207, "initFee": 385, "insurance": 0, "totalRepayment": 4176, "monthly": 696, "fortnightly": 348, "weekly": 174 }
  },
  "3600": {
    "1": { "interest": 72, "serviceFee": 47, "initFee": 425, "insurance": 0, "totalRepayment": 4144, "monthly": 4144, "fortnightly": 2072, "weekly": 1036 },
    "2": { "interest": 144, "serviceFee": 103, "initFee": 425, "insurance": 0, "totalRepayment": 4272, "monthly": 2136, "fortnightly": 1068, "weekly": 534 },
    "3": { "interest": 216, "serviceFee": 139, "initFee": 425, "insurance": 0, "totalRepayment": 4380, "monthly": 1460, "fortnightly": 730, "weekly": 365 },
    "4": { "interest": 288, "serviceFee": 183, "initFee": 425, "insurance": 0, "totalRepayment": 4496, "monthly": 1124, "fortnightly": 562, "weekly": 281 },
    "5": { "interest": 360, "serviceFee": 195, "initFee": 425, "insurance": 0, "totalRepayment": 4580, "monthly": 916, "fortnightly": 458, "weekly": 229 },
    "6": { "interest": 432, "serviceFee": 199, "initFee": 425, "insurance": 0, "totalRepayment": 4656, "monthly": 776, "fortnightly": 388, "weekly": 194 }
  },
  "4000": {
    "1": { "interest": 80, "serviceFee": 47, "initFee": 465, "insurance": 0, "totalRepayment": 4592, "monthly": 4592, "fortnightly": 2296, "weekly": 1148 },
    "2": { "interest": 160, "serviceFee": 103, "initFee": 465, "insurance": 0, "totalRepayment": 4728, "monthly": 2364, "fortnightly": 1182, "weekly": 591 },
    "3": { "interest": 240, "serviceFee": 131, "initFee": 465, "insurance": 0, "totalRepayment": 4836, "monthly": 1612, "fortnightly": 806, "weekly": 403 },
    "4": { "interest": 320, "serviceFee": 159, "initFee": 465, "insurance": 0, "totalRepayment": 4944, "monthly": 1236, "fortnightly": 618, "weekly": 309 },
    "5": { "interest": 400, "serviceFee": 175, "initFee": 465, "insurance": 0, "totalRepayment": 5040, "monthly": 1008, "fortnightly": 504, "weekly": 252 },
    "6": { "interest": 480, "serviceFee": 191, "initFee": 465, "insurance": 0, "totalRepayment": 5136, "monthly": 856, "fortnightly": 428, "weekly": 214 }
  },
  "4400": {
    "1": { "interest": 88, "serviceFee": 47, "initFee": 505, "insurance": 0, "totalRepayment": 5040, "monthly": 5040, "fortnightly": 2520, "weekly": 1260 },
    "2": { "interest": 176, "serviceFee": 103, "initFee": 505, "insurance": 0, "totalRepayment": 5184, "monthly": 2592, "fortnightly": 1296, "weekly": 648 },
    "3": { "interest": 264, "serviceFee": 123, "initFee": 505, "insurance": 0, "totalRepayment": 5292, "monthly": 1764, "fortnightly": 882, "weekly": 441 },
    "4": { "interest": 352, "serviceFee": 135, "initFee": 505, "insurance": 0, "totalRepayment": 5392, "monthly": 1348, "fortnightly": 674, "weekly": 337 },
    "5": { "interest": 440, "serviceFee": 155, "initFee": 505, "insurance": 0, "totalRepayment": 5500, "monthly": 1100, "fortnightly": 550, "weekly": 275 },
    "6": { "interest": 528, "serviceFee": 159, "initFee": 505, "insurance": 0, "totalRepayment": 5592, "monthly": 932, "fortnightly": 466, "weekly": 233 }
  },
  "4800": {
    "1": { "interest": 96, "serviceFee": 47, "initFee": 545, "insurance": 0, "totalRepayment": 5488, "monthly": 5488, "fortnightly": 2744, "weekly": 1372 },
    "2": { "interest": 192, "serviceFee": 103, "initFee": 545, "insurance": 0, "totalRepayment": 5640, "monthly": 2820, "fortnightly": 1410, "weekly": 705 },
    "3": { "interest": 288, "serviceFee": 115, "initFee": 545, "insurance": 0, "totalRepayment": 5748, "monthly": 1916, "fortnightly": 958, "weekly": 479 },
    "4": { "interest": 384, "serviceFee": 127, "initFee": 545, "insurance": 0, "totalRepayment": 5856, "monthly": 1464, "fortnightly": 732, "weekly": 366 },
    "5": { "interest": 480, "serviceFee": 135, "initFee": 545, "insurance": 0, "totalRepayment": 5960, "monthly": 1192, "fortnightly": 596, "weekly": 298 },
    "6": { "interest": 576, "serviceFee": 151, "initFee": 545, "insurance": 0, "totalRepayment": 6072, "monthly": 1012, "fortnightly": 506, "weekly": 253 }
  },
  "5200": {
    "1": { "interest": 104, "serviceFee": 47, "initFee": 585, "insurance": 0, "totalRepayment": 5936, "monthly": 5936, "fortnightly": 2968, "weekly": 1484 },
    "2": { "interest": 208, "serviceFee": 103, "initFee": 585, "insurance": 0, "totalRepayment": 6096, "monthly": 3048, "fortnightly": 1524, "weekly": 762 },
    "3": { "interest": 312, "serviceFee": 107, "initFee": 585, "insurance": 0, "totalRepayment": 6204, "monthly": 2068, "fortnightly": 1034, "weekly": 517 },
    "4": { "interest": 416, "serviceFee": 119, "initFee": 585, "insurance": 0, "totalRepayment": 6320, "monthly": 1580, "fortnightly": 790, "weekly": 395 },
    "5": { "interest": 520, "serviceFee": 135, "initFee": 585, "insurance": 0, "totalRepayment": 6440, "monthly": 1288, "fortnightly": 644, "weekly": 322 },
    "6": { "interest": 624, "serviceFee": 143, "initFee": 585, "insurance": 0, "totalRepayment": 6552, "monthly": 1092, "fortnightly": 546, "weekly": 273 }
  },
  "5600": {
    "1": { "interest": 112, "serviceFee": 47, "initFee": 625, "insurance": 0, "totalRepayment": 6384, "monthly": 6384, "fortnightly": 3192, "weekly": 1596 },
    "2": { "interest": 224, "serviceFee": 103, "initFee": 625, "insurance": 0, "totalRepayment": 6552, "monthly": 3276, "fortnightly": 1638, "weekly": 819 },
    "3": { "interest": 336, "serviceFee": 111, "initFee": 625, "insurance": 0, "totalRepayment": 6672, "monthly": 2224, "fortnightly": 1112, "weekly": 556 },
    "4": { "interest": 448, "serviceFee": 127, "initFee": 625, "insurance": 0, "totalRepayment": 6800, "monthly": 1700, "fortnightly": 850, "weekly": 425 },
    "5": { "interest": 560, "serviceFee": 135, "initFee": 625, "insurance": 0, "totalRepayment": 6920, "monthly": 1384, "fortnightly": 692, "weekly": 346 },
    "6": { "interest": 672, "serviceFee": 159, "initFee": 625, "insurance": 0, "totalRepayment": 7056, "monthly": 1176, "fortnightly": 588, "weekly": 294 }
  },
  "6000": {
    "1": { "interest": 120, "serviceFee": 47, "initFee": 665, "insurance": 0, "totalRepayment": 6832, "monthly": 6832, "fortnightly": 3416, "weekly": 1708 },
    "2": { "interest": 240, "serviceFee": 103, "initFee": 665, "insurance": 0, "totalRepayment": 7008, "monthly": 3504, "fortnightly": 1752, "weekly": 876 },
    "3": { "interest": 360, "serviceFee": 115, "initFee": 665, "insurance": 0, "totalRepayment": 7140, "monthly": 2380, "fortnightly": 1190, "weekly": 595 },
    "4": { "interest": 480, "serviceFee": 119, "initFee": 665, "insurance": 0, "totalRepayment": 7264, "monthly": 1816, "fortnightly": 908, "weekly": 454 },
    "5": { "interest": 600, "serviceFee": 135, "initFee": 665, "insurance": 0, "totalRepayment": 7400, "monthly": 1480, "fortnightly": 740, "weekly": 370 },
    "6": { "interest": 720, "serviceFee": 151, "initFee": 665, "insurance": 0, "totalRepayment": 7536, "monthly": 1256, "fortnightly": 628, "weekly": 314 }
  },
  "6400": {
    "1": { "interest": 128, "serviceFee": 47, "initFee": 705, "insurance": 0, "totalRepayment": 7280, "monthly": 7280, "fortnightly": 3640, "weekly": 1820 },
    "2": { "interest": 256, "serviceFee": 103, "initFee": 705, "insurance": 0, "totalRepayment": 7464, "monthly": 3732, "fortnightly": 1866, "weekly": 933 },
    "3": { "interest": 384, "serviceFee": 107, "initFee": 705, "insurance": 0, "totalRepayment": 7596, "monthly": 2532, "fortnightly": 1266, "weekly": 633 },
    "4": { "interest": 512, "serviceFee": 111, "initFee": 705, "insurance": 0, "totalRepayment": 7728, "monthly": 1932, "fortnightly": 966, "weekly": 483 },
    "5": { "interest": 640, "serviceFee": 115, "initFee": 705, "insurance": 0, "totalRepayment": 7860, "monthly": 1572, "fortnightly": 786, "weekly": 393 },
    "6": { "interest": 768, "serviceFee": 119, "initFee": 705, "insurance": 0, "totalRepayment": 7992, "monthly": 1332, "fortnightly": 666, "weekly": 333 }
  },
  "6800": {
    "1": { "interest": 136, "serviceFee": 47, "initFee": 745, "insurance": 0, "totalRepayment": 7728, "monthly": 7728, "fortnightly": 3864, "weekly": 1932 },
    "2": { "interest": 272, "serviceFee": 103, "initFee": 745, "insurance": 0, "totalRepayment": 7920, "monthly": 3960, "fortnightly": 1980, "weekly": 990 },
    "3": { "interest": 408, "serviceFee": 111, "initFee": 745, "insurance": 0, "totalRepayment": 8064, "monthly": 2688, "fortnightly": 1344, "weekly": 672 },
    "4": { "interest": 544, "serviceFee": 119, "initFee": 745, "insurance": 0, "totalRepayment": 8208, "monthly": 2052, "fortnightly": 1026, "weekly": 513 },
    "5": { "interest": 680, "serviceFee": 135, "initFee": 745, "insurance": 0, "totalRepayment": 8360, "monthly": 1672, "fortnightly": 836, "weekly": 418 },
    "6": { "interest": 816, "serviceFee": 159, "initFee": 745, "insurance": 0, "totalRepayment": 8520, "monthly": 1420, "fortnightly": 710, "weekly": 355 }
  },
  "7200": {
    "1": { "interest": 144, "serviceFee": 47, "initFee": 785, "insurance": 0, "totalRepayment": 8176, "monthly": 8176, "fortnightly": 4088, "weekly": 2044 },
    "2": { "interest": 288, "serviceFee": 103, "initFee": 785, "insurance": 0, "totalRepayment": 8376, "monthly": 4188, "fortnightly": 2094, "weekly": 1047 },
    "3": { "interest": 432, "serviceFee": 115, "initFee": 785, "insurance": 0, "totalRepayment": 8532, "monthly": 2844, "fortnightly": 1422, "weekly": 711 },
    "4": { "interest": 576, "serviceFee": 127, "initFee": 785, "insurance": 0, "totalRepayment": 8688, "monthly": 2172, "fortnightly": 1086, "weekly": 543 },
    "5": { "interest": 720, "serviceFee": 135, "initFee": 785, "insurance": 0, "totalRepayment": 8840, "monthly": 1768, "fortnightly": 884, "weekly": 442 },
    "6": { "interest": 864, "serviceFee": 151, "initFee": 785, "insurance": 0, "totalRepayment": 9000, "monthly": 1500, "fortnightly": 750, "weekly": 375 }
  },
  "7600": {
    "1": { "interest": 152, "serviceFee": 47, "initFee": 825, "insurance": 0, "totalRepayment": 8624, "monthly": 8624, "fortnightly": 4312, "weekly": 2156 },
    "2": { "interest": 304, "serviceFee": 103, "initFee": 825, "insurance": 0, "totalRepayment": 8832, "monthly": 4416, "fortnightly": 2208, "weekly": 1104 },
    "3": { "interest": 456, "serviceFee": 107, "initFee": 825, "insurance": 0, "totalRepayment": 8988, "monthly": 2996, "fortnightly": 1498, "weekly": 749 },
    "4": { "interest": 608, "serviceFee": 119, "initFee": 825, "insurance": 0, "totalRepayment": 9152, "monthly": 2288, "fortnightly": 1144, "weekly": 572 },
    "5": { "interest": 760, "serviceFee": 135, "initFee": 825, "insurance": 0, "totalRepayment": 9320, "monthly": 1864, "fortnightly": 932, "weekly": 466 },
    "6": { "interest": 912, "serviceFee": 143, "initFee": 825, "insurance": 0, "totalRepayment": 9480, "monthly": 1580, "fortnightly": 790, "weekly": 395 }
  },
  "8000": {
    "1": { "interest": 160, "serviceFee": 47, "initFee": 865, "insurance": 0, "totalRepayment": 9072, "monthly": 9072, "fortnightly": 4536, "weekly": 2268 },
    "2": { "interest": 320, "serviceFee": 103, "initFee": 865, "insurance": 0, "totalRepayment": 9288, "monthly": 4644, "fortnightly": 2322, "weekly": 1161 },
    "3": { "interest": 480, "serviceFee": 111, "initFee": 865, "insurance": 0, "totalRepayment": 9456, "monthly": 3152, "fortnightly": 1576, "weekly": 788 },
    "4": { "interest": 640, "serviceFee": 127, "initFee": 865, "insurance": 0, "totalRepayment": 9632, "monthly": 2408, "fortnightly": 1204, "weekly": 602 },
    "5": { "interest": 800, "serviceFee": 135, "initFee": 865, "insurance": 0, "totalRepayment": 9800, "monthly": 1960, "fortnightly": 980, "weekly": 490 },
    "6": { "interest": 960, "serviceFee": 159, "initFee": 865, "insurance": 0, "totalRepayment": 9984, "monthly": 1664, "fortnightly": 832, "weekly": 416 }
  }
};

module.exports = { LOAN_MATRIX };
