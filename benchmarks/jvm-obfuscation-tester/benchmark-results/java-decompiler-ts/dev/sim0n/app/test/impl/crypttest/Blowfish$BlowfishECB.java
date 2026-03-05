package dev.sim0n.app.test.impl.crypttest;

class Blowfish$BlowfishECB {
  public static final int MAXKEYLENGTH = 56;
  public static final int BLOCKSIZE = 8;
  static final int PBOX_ENTRIES = 18;
  static final int SBOX_ENTRIES = 256;
  int[] m_pbox;
  int[] m_sbox1;
  int[] m_sbox2;
  int[] m_sbox3;
  int[] m_sbox4;
  static final int[] pbox_init;
  static final int[] sbox_init_1;
  static final int[] sbox_init_2;
  static final int[] sbox_init_3;
  static final int[] sbox_init_4;

  public Blowfish$BlowfishECB(byte[] bfkey) {
    this.m_pbox = new int[18];
    int nI = 0;
    while (nI < 18) {
      this.m_pbox[nI] = pbox_init[nI];
      nI++;
    }
    this.m_sbox1 = new int[256];
    this.m_sbox2 = new int[256];
    this.m_sbox3 = new int[256];
    this.m_sbox4 = new int[256];
    for (nI = 0; nI < 256; nI++) {
      this.m_sbox1[nI] = sbox_init_1[nI];
      this.m_sbox2[nI] = sbox_init_2[nI];
      this.m_sbox3[nI] = sbox_init_3[nI];
      this.m_sbox4[nI] = sbox_init_4[nI];
    }
    int nLen = bfkey.length;
    if (nLen == 0) {
      return;
    }
    int nKeyPos = 0;
    int nBuild = 0;
    for (nI = 0; nI < 18; nI++) {
      for (int nJ = 0; nJ < 4; nJ++) {
        nBuild = nBuild << 8 | bfkey[nKeyPos] & 255;
        nKeyPos++;
        if (nKeyPos == nLen) {
          nKeyPos = 0;
        }
      }
      this.m_pbox[nI] ^= nBuild;
    }
    long lZero = 0;
    for (nI = 0; nI < 18; nI += 2) {
      lZero = this.encryptBlock(lZero);
      this.m_pbox[nI] = (int) (lZero >>> 32);
      this.m_pbox[nI + 1] = (int) (lZero & 4294967295L);
    }
    for (nI = 0; nI < 256; nI += 2) {
      lZero = this.encryptBlock(lZero);
      this.m_sbox1[nI] = (int) (lZero >>> 32);
      this.m_sbox1[nI + 1] = (int) (lZero & 4294967295L);
    }
    for (nI = 0; nI < 256; nI += 2) {
      lZero = this.encryptBlock(lZero);
      this.m_sbox2[nI] = (int) (lZero >>> 32);
      this.m_sbox2[nI + 1] = (int) (lZero & 4294967295L);
    }
    for (nI = 0; nI < 256; nI += 2) {
      lZero = this.encryptBlock(lZero);
      this.m_sbox3[nI] = (int) (lZero >>> 32);
      this.m_sbox3[nI + 1] = (int) (lZero & 4294967295L);
    }
    for (nI = 0; nI < 256; nI += 2) {
      lZero = this.encryptBlock(lZero);
      this.m_sbox4[nI] = (int) (lZero >>> 32);
      this.m_sbox4[nI + 1] = (int) (lZero & 4294967295L);
    }
  }

  public void cleanUp() {
    int nI = 0;
    while (nI < 18) {
      this.m_pbox[nI] = 0;
      nI++;
    }
    for (nI = 0; nI < 256; nI++) {
      this.m_sbox4[nI] = 0;
      this.m_sbox3[nI] = 0;
      this.m_sbox2[nI] = 0;
      this.m_sbox1[nI] = 0;
    }
  }

  public static boolean selfTest() {
    tmpArray2 = new byte[8];
    tmpArray2[0] = 28;
    tmpArray2[1] = 88;
    tmpArray2[2] = 127;
    tmpArray2[3] = 28;
    tmpArray2[4] = 19;
    tmpArray2[5] = -110;
    tmpArray2[6] = 79;
    tmpArray2[7] = -17;
    byte[] testKey1 = new byte[8];
    tmpArray3 = new int[2];
    tmpArray3[0] = 810889768;
    tmpArray3[1] = 1836001626;
    int[] tv_p1 = new int[2];
    tmpArray4 = new int[2];
    tmpArray4[0] = 1439381364;
    tmpArray4[1] = -784403967;
    int[] tv_c1 = new int[2];
    int[] tv_t1 = new int[2];
    String sTestKey2 = "Who is John Galt?";
    byte[] testKey2 = sTestKey2.getBytes();
    tmpArray5 = new int[2];
    tmpArray5[0] = -19088744;
    tmpArray5[1] = 1985229328;
    int[] tv_p2 = new int[2];
    tmpArray6 = new int[2];
    tmpArray6[0] = -862883029;
    tmpArray6[1] = -2145192316;
    int[] tv_c2 = new int[2];
    int[] tv_t2 = new int[2];
    Blowfish$BlowfishECB testbf1 = new Blowfish$BlowfishECB(testKey1);
    testbf1.encrypt(tv_p1, tv_t1);
    if (tv_t1[0] != tv_c1[0]) {
      return 0;
    }
    if (tv_t1[1] != tv_c1[1]) {
      return 0;
    }
    testbf1.decrypt(tv_t1);
    if (tv_t1[0] != tv_p1[0]) {
      return 0;
    }
    if (tv_t1[1] != tv_p1[1]) {
      return 0;
    }
    testbf2 = new Blowfish$BlowfishECB(testKey2);
    testbf2.encrypt(tv_p2, tv_t2);
    if (tv_t2[0] != tv_c2[0]) {
      return 0;
    }
    if (tv_t2[1] != tv_c2[1]) {
      return 0;
    }
    testbf2.decrypt(tv_t2);
    if (tv_t2[0] != tv_p2[0]) {
      return 0;
    }
    if (tv_t2[1] == tv_p2[1]) {
      return 1;
    } else {
      return 0;
    }
  }

  protected long encryptBlock(long lPlainBlock) {
    int nHi = Blowfish.access$000(lPlainBlock);
    int nLo = Blowfish.access$100(lPlainBlock);
    int[] sbox1 = this.m_sbox1;
    int[] sbox2 = this.m_sbox2;
    int[] sbox3 = this.m_sbox3;
    int[] sbox4 = this.m_sbox4;
    int[] pbox = this.m_pbox;
    nHi ^= pbox[0];
    nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255]
        ^ pbox[1];
    nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255]
        ^ pbox[2];
    nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255]
        ^ pbox[3];
    nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255]
        ^ pbox[4];
    nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255]
        ^ pbox[5];
    nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255]
        ^ pbox[6];
    nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255]
        ^ pbox[7];
    nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255]
        ^ pbox[8];
    nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255]
        ^ pbox[9];
    nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255]
        ^ pbox[10];
    nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255]
        ^ pbox[11];
    nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255]
        ^ pbox[12];
    nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255]
        ^ pbox[13];
    nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255]
        ^ pbox[14];
    nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255]
        ^ pbox[15];
    nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255]
        ^ pbox[16];
    return Blowfish.access$200(nHi, nLo ^ pbox[17]);
  }

  protected long decryptBlock(long lCipherBlock) {
    int nHi = Blowfish.access$000(lCipherBlock);
    int nLo = Blowfish.access$100(lCipherBlock);
    nHi ^= this.m_pbox[17];
    nLo ^=
        (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255])
                + this.m_sbox4[nHi & 255]
            ^ this.m_pbox[16];
    nHi ^=
        (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255])
                + this.m_sbox4[nLo & 255]
            ^ this.m_pbox[15];
    nLo ^=
        (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255])
                + this.m_sbox4[nHi & 255]
            ^ this.m_pbox[14];
    nHi ^=
        (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255])
                + this.m_sbox4[nLo & 255]
            ^ this.m_pbox[13];
    nLo ^=
        (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255])
                + this.m_sbox4[nHi & 255]
            ^ this.m_pbox[12];
    nHi ^=
        (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255])
                + this.m_sbox4[nLo & 255]
            ^ this.m_pbox[11];
    nLo ^=
        (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255])
                + this.m_sbox4[nHi & 255]
            ^ this.m_pbox[10];
    nHi ^=
        (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255])
                + this.m_sbox4[nLo & 255]
            ^ this.m_pbox[9];
    nLo ^=
        (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255])
                + this.m_sbox4[nHi & 255]
            ^ this.m_pbox[8];
    nHi ^=
        (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255])
                + this.m_sbox4[nLo & 255]
            ^ this.m_pbox[7];
    nLo ^=
        (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255])
                + this.m_sbox4[nHi & 255]
            ^ this.m_pbox[6];
    nHi ^=
        (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255])
                + this.m_sbox4[nLo & 255]
            ^ this.m_pbox[5];
    nLo ^=
        (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255])
                + this.m_sbox4[nHi & 255]
            ^ this.m_pbox[4];
    nHi ^=
        (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255])
                + this.m_sbox4[nLo & 255]
            ^ this.m_pbox[3];
    nLo ^=
        (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255])
                + this.m_sbox4[nHi & 255]
            ^ this.m_pbox[2];
    nHi ^=
        (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255])
                + this.m_sbox4[nLo & 255]
            ^ this.m_pbox[1];
    return Blowfish.access$200(nHi, nLo ^ this.m_pbox[0]);
  }

  public void encrypt(byte[] inbuffer, byte[] outbuffer) {
    int nLen = inbuffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$300(inbuffer, nI);
      lTemp = this.encryptBlock(lTemp);
      Blowfish.access$400(lTemp, outbuffer, nI);
      int nI = nI + 8;
    }
  }

  public void encrypt(byte[] buffer) {
    int nLen = buffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$300(buffer, nI);
      lTemp = this.encryptBlock(lTemp);
      Blowfish.access$400(lTemp, buffer, nI);
      int nI = nI + 8;
    }
  }

  public void encrypt(int[] inbuffer, int[] outbuffer) {
    int nLen = inbuffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$500(inbuffer, nI);
      lTemp = this.encryptBlock(lTemp);
      Blowfish.access$600(lTemp, outbuffer, nI);
      int nI = nI + 2;
    }
  }

  public void encrypt(int[] buffer) {
    int nLen = buffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$500(buffer, nI);
      lTemp = this.encryptBlock(lTemp);
      Blowfish.access$600(lTemp, buffer, nI);
      int nI = nI + 2;
    }
  }

  public void encrypt(long[] inbuffer, long[] outbuffer) {
    int nLen = inbuffer.length;
    while (nI < nLen) {
      outbuffer[nI] = this.encryptBlock(inbuffer[nI]);
      int nI = nI + 1;
    }
  }

  public void encrypt(long[] buffer) {
    int nLen = buffer.length;
    while (nI < nLen) {
      buffer[nI] = this.encryptBlock(buffer[nI]);
      int nI = nI + 1;
    }
  }

  public void decrypt(byte[] inbuffer, byte[] outbuffer) {
    int nLen = inbuffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$300(inbuffer, nI);
      lTemp = this.decryptBlock(lTemp);
      Blowfish.access$400(lTemp, outbuffer, nI);
      int nI = nI + 8;
    }
  }

  public void decrypt(byte[] buffer) {
    int nLen = buffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$300(buffer, nI);
      lTemp = this.decryptBlock(lTemp);
      Blowfish.access$400(lTemp, buffer, nI);
      int nI = nI + 8;
    }
  }

  public void decrypt(int[] inbuffer, int[] outbuffer) {
    int nLen = inbuffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$500(inbuffer, nI);
      lTemp = this.decryptBlock(lTemp);
      Blowfish.access$600(lTemp, outbuffer, nI);
      int nI = nI + 2;
    }
  }

  public void decrypt(int[] buffer) {
    int nLen = buffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$500(buffer, nI);
      lTemp = this.decryptBlock(lTemp);
      Blowfish.access$600(lTemp, buffer, nI);
      int nI = nI + 2;
    }
  }

  public void decrypt(long[] inbuffer, long[] outbuffer) {
    int nLen = inbuffer.length;
    while (nI < nLen) {
      outbuffer[nI] = this.decryptBlock(inbuffer[nI]);
      int nI = nI + 1;
    }
  }

  public void decrypt(long[] buffer) {
    int nLen = buffer.length;
    while (nI < nLen) {
      buffer[nI] = this.decryptBlock(buffer[nI]);
      int nI = nI + 1;
    }
  }

  static {
    tmpArray0 = new int[18];
    tmpArray0[0] = 608135816;
    tmpArray0[1] = -2052912941;
    tmpArray0[2] = 320440878;
    tmpArray0[3] = 57701188;
    tmpArray0[4] = -1542899678;
    tmpArray0[5] = 698298832;
    tmpArray0[6] = 137296536;
    tmpArray0[7] = -330404727;
    tmpArray0[8] = 1160258022;
    tmpArray0[9] = 953160567;
    tmpArray0[10] = -1101764913;
    tmpArray0[11] = 887688300;
    tmpArray0[12] = -1062458953;
    tmpArray0[13] = -914599715;
    tmpArray0[14] = 1065670069;
    tmpArray0[15] = -1253635817;
    tmpArray0[16] = -1843997223;
    tmpArray0[17] = -1988494565;
    pbox_init = tmpArray0;
    tmpArray1 = new int[256];
    tmpArray1[0] = -785314906;
    tmpArray1[1] = -1730169428;
    tmpArray1[2] = 805139163;
    tmpArray1[3] = -803545161;
    tmpArray1[4] = -1193168915;
    tmpArray1[5] = 1780907670;
    tmpArray1[6] = -1166241723;
    tmpArray1[7] = -248741991;
    tmpArray1[8] = 614570311;
    tmpArray1[9] = -1282315017;
    tmpArray1[10] = 134345442;
    tmpArray1[11] = -2054226922;
    tmpArray1[12] = 1667834072;
    tmpArray1[13] = 1901547113;
    tmpArray1[14] = -1537671517;
    tmpArray1[15] = -191677058;
    tmpArray1[16] = 227898511;
    tmpArray1[17] = 1921955416;
    tmpArray1[18] = 1904987480;
    tmpArray1[19] = -2112533778;
    tmpArray1[20] = 2069144605;
    tmpArray1[21] = -1034266187;
    tmpArray1[22] = -1674521287;
    tmpArray1[23] = 720527379;
    tmpArray1[24] = -976113629;
    tmpArray1[25] = 677414384;
    tmpArray1[26] = -901678824;
    tmpArray1[27] = -1193592593;
    tmpArray1[28] = -1904616272;
    tmpArray1[29] = 1614419982;
    tmpArray1[30] = 1822297739;
    tmpArray1[31] = -1340175810;
    tmpArray1[32] = -686458943;
    tmpArray1[33] = -1120842969;
    tmpArray1[34] = 2024746970;
    tmpArray1[35] = 1432378464;
    tmpArray1[36] = -430627341;
    tmpArray1[37] = -1437226092;
    tmpArray1[38] = 1464375394;
    tmpArray1[39] = 1676153920;
    tmpArray1[40] = 1439316330;
    tmpArray1[41] = 715854006;
    tmpArray1[42] = -1261675468;
    tmpArray1[43] = 289532110;
    tmpArray1[44] = -1588296017;
    tmpArray1[45] = 2087905683;
    tmpArray1[46] = -1276242927;
    tmpArray1[47] = 1668267050;
    tmpArray1[48] = 732546397;
    tmpArray1[49] = 1947742710;
    tmpArray1[50] = -832815594;
    tmpArray1[51] = -1685613794;
    tmpArray1[52] = -1344882125;
    tmpArray1[53] = 1814351708;
    tmpArray1[54] = 2050118529;
    tmpArray1[55] = 680887927;
    tmpArray1[56] = 999245976;
    tmpArray1[57] = 1800124847;
    tmpArray1[58] = -994056165;
    tmpArray1[59] = 1713906067;
    tmpArray1[60] = 1641548236;
    tmpArray1[61] = -81679983;
    tmpArray1[62] = 1216130144;
    tmpArray1[63] = 1575780402;
    tmpArray1[64] = -276538019;
    tmpArray1[65] = -377129551;
    tmpArray1[66] = -601480446;
    tmpArray1[67] = -345695352;
    tmpArray1[68] = 596196993;
    tmpArray1[69] = -745100091;
    tmpArray1[70] = 258830323;
    tmpArray1[71] = -2081144263;
    tmpArray1[72] = 772490370;
    tmpArray1[73] = -1534844924;
    tmpArray1[74] = 1774776394;
    tmpArray1[75] = -1642095778;
    tmpArray1[76] = 566650946;
    tmpArray1[77] = -152474470;
    tmpArray1[78] = 1728879713;
    tmpArray1[79] = -1412200208;
    tmpArray1[80] = 1783734482;
    tmpArray1[81] = -665571480;
    tmpArray1[82] = -1777359064;
    tmpArray1[83] = -1420741725;
    tmpArray1[84] = 1861159788;
    tmpArray1[85] = 326777828;
    tmpArray1[86] = -1170476976;
    tmpArray1[87] = 2130389656;
    tmpArray1[88] = -1578015459;
    tmpArray1[89] = 967770486;
    tmpArray1[90] = 1724537150;
    tmpArray1[91] = -2109534584;
    tmpArray1[92] = -1930525159;
    tmpArray1[93] = 1164943284;
    tmpArray1[94] = 2105845187;
    tmpArray1[95] = 998989502;
    tmpArray1[96] = -529566248;
    tmpArray1[97] = -2050940813;
    tmpArray1[98] = 1075463327;
    tmpArray1[99] = 1455516326;
    tmpArray1[100] = 1322494562;
    tmpArray1[101] = 910128902;
    tmpArray1[102] = 469688178;
    tmpArray1[103] = 1117454909;
    tmpArray1[104] = 936433444;
    tmpArray1[105] = -804646328;
    tmpArray1[106] = -619713837;
    tmpArray1[107] = 1240580251;
    tmpArray1[108] = 122909385;
    tmpArray1[109] = -2137449605;
    tmpArray1[110] = 634681816;
    tmpArray1[111] = -152510729;
    tmpArray1[112] = -469872614;
    tmpArray1[113] = -1233564613;
    tmpArray1[114] = -1754472259;
    tmpArray1[115] = 79693498;
    tmpArray1[116] = -1045868618;
    tmpArray1[117] = 1084186820;
    tmpArray1[118] = 1583128258;
    tmpArray1[119] = 426386531;
    tmpArray1[120] = 1761308591;
    tmpArray1[121] = 1047286709;
    tmpArray1[122] = 322548459;
    tmpArray1[123] = 995290223;
    tmpArray1[124] = 1845252383;
    tmpArray1[125] = -1691314900;
    tmpArray1[126] = -863943356;
    tmpArray1[127] = -1352745719;
    tmpArray1[128] = -1092366332;
    tmpArray1[129] = -567063811;
    tmpArray1[130] = 1712269319;
    tmpArray1[131] = 422464435;
    tmpArray1[132] = -1060394921;
    tmpArray1[133] = 1170764815;
    tmpArray1[134] = -771006663;
    tmpArray1[135] = -1177289765;
    tmpArray1[136] = 1434042557;
    tmpArray1[137] = 442511882;
    tmpArray1[138] = -694091578;
    tmpArray1[139] = 1076654713;
    tmpArray1[140] = 1738483198;
    tmpArray1[141] = -81812532;
    tmpArray1[142] = -1901729288;
    tmpArray1[143] = -617471240;
    tmpArray1[144] = 1014306527;
    tmpArray1[145] = -43947243;
    tmpArray1[146] = 793779912;
    tmpArray1[147] = -1392160085;
    tmpArray1[148] = 842905082;
    tmpArray1[149] = -48003232;
    tmpArray1[150] = 1395751752;
    tmpArray1[151] = 1040244610;
    tmpArray1[152] = -1638115397;
    tmpArray1[153] = -898659168;
    tmpArray1[154] = 445077038;
    tmpArray1[155] = -552113701;
    tmpArray1[156] = -717051658;
    tmpArray1[157] = 679411651;
    tmpArray1[158] = -1402522938;
    tmpArray1[159] = -1940957837;
    tmpArray1[160] = 1767581616;
    tmpArray1[161] = -1144366904;
    tmpArray1[162] = -503340195;
    tmpArray1[163] = -1192226400;
    tmpArray1[164] = 284835224;
    tmpArray1[165] = -48135240;
    tmpArray1[166] = 1258075500;
    tmpArray1[167] = 768725851;
    tmpArray1[168] = -1705778055;
    tmpArray1[169] = -1225243291;
    tmpArray1[170] = -762426948;
    tmpArray1[171] = 1274779536;
    tmpArray1[172] = -505548070;
    tmpArray1[173] = -1530167757;
    tmpArray1[174] = 1660621633;
    tmpArray1[175] = -823867672;
    tmpArray1[176] = -283063590;
    tmpArray1[177] = 913787905;
    tmpArray1[178] = -797008130;
    tmpArray1[179] = 737222580;
    tmpArray1[180] = -1780753843;
    tmpArray1[181] = -1366257256;
    tmpArray1[182] = -357724559;
    tmpArray1[183] = 1804850592;
    tmpArray1[184] = -795946544;
    tmpArray1[185] = -1345903136;
    tmpArray1[186] = -1908647121;
    tmpArray1[187] = -1904896841;
    tmpArray1[188] = -1879645445;
    tmpArray1[189] = -233690268;
    tmpArray1[190] = -2004305902;
    tmpArray1[191] = -1878134756;
    tmpArray1[192] = 1336762016;
    tmpArray1[193] = 1754252060;
    tmpArray1[194] = -774901359;
    tmpArray1[195] = -1280786003;
    tmpArray1[196] = 791618072;
    tmpArray1[197] = -1106372745;
    tmpArray1[198] = -361419266;
    tmpArray1[199] = -1962795103;
    tmpArray1[200] = -442446833;
    tmpArray1[201] = -1250986776;
    tmpArray1[202] = 413987798;
    tmpArray1[203] = -829824359;
    tmpArray1[204] = -1264037920;
    tmpArray1[205] = -49028937;
    tmpArray1[206] = 2093235073;
    tmpArray1[207] = -760370983;
    tmpArray1[208] = 375366246;
    tmpArray1[209] = -2137688315;
    tmpArray1[210] = -1815317740;
    tmpArray1[211] = 555357303;
    tmpArray1[212] = -424861595;
    tmpArray1[213] = 2008414854;
    tmpArray1[214] = -950779147;
    tmpArray1[215] = -73583153;
    tmpArray1[216] = -338841844;
    tmpArray1[217] = 2067696032;
    tmpArray1[218] = -700376109;
    tmpArray1[219] = -1373733303;
    tmpArray1[220] = 2428461;
    tmpArray1[221] = 544322398;
    tmpArray1[222] = 577241275;
    tmpArray1[223] = 1471733935;
    tmpArray1[224] = 610547355;
    tmpArray1[225] = -267798242;
    tmpArray1[226] = 1432588573;
    tmpArray1[227] = 1507829418;
    tmpArray1[228] = 2025931657;
    tmpArray1[229] = -648391809;
    tmpArray1[230] = 545086370;
    tmpArray1[231] = 48609733;
    tmpArray1[232] = -2094660746;
    tmpArray1[233] = 1653985193;
    tmpArray1[234] = 298326376;
    tmpArray1[235] = 1316178497;
    tmpArray1[236] = -1287180854;
    tmpArray1[237] = 2064951626;
    tmpArray1[238] = 458293330;
    tmpArray1[239] = -1705826027;
    tmpArray1[240] = -703637697;
    tmpArray1[241] = -1130641692;
    tmpArray1[242] = 727753846;
    tmpArray1[243] = -2115603456;
    tmpArray1[244] = 146436021;
    tmpArray1[245] = 1461446943;
    tmpArray1[246] = -224990101;
    tmpArray1[247] = 705550613;
    tmpArray1[248] = -1235000031;
    tmpArray1[249] = -407242314;
    tmpArray1[250] = -13368018;
    tmpArray1[251] = -981117340;
    tmpArray1[252] = 1404054877;
    tmpArray1[253] = -1449160799;
    tmpArray1[254] = 146425753;
    tmpArray1[255] = 1854211946;
    sbox_init_1 = tmpArray1;
    tmpArray2 = new int[256];
    tmpArray2[0] = 1266315497;
    tmpArray2[1] = -1246549692;
    tmpArray2[2] = -613086930;
    tmpArray2[3] = -1004984797;
    tmpArray2[4] = -1385257296;
    tmpArray2[5] = 1235738493;
    tmpArray2[6] = -1662099272;
    tmpArray2[7] = -1880247706;
    tmpArray2[8] = -324367247;
    tmpArray2[9] = 1771706367;
    tmpArray2[10] = 1449415276;
    tmpArray2[11] = -1028546847;
    tmpArray2[12] = 422970021;
    tmpArray2[13] = 1963543593;
    tmpArray2[14] = -1604775104;
    tmpArray2[15] = -468174274;
    tmpArray2[16] = 1062508698;
    tmpArray2[17] = 1531092325;
    tmpArray2[18] = 1804592342;
    tmpArray2[19] = -1711849514;
    tmpArray2[20] = -1580033017;
    tmpArray2[21] = -269995787;
    tmpArray2[22] = 1294809318;
    tmpArray2[23] = -265986623;
    tmpArray2[24] = 1289560198;
    tmpArray2[25] = -2072974554;
    tmpArray2[26] = 1669523910;
    tmpArray2[27] = 35572830;
    tmpArray2[28] = 157838143;
    tmpArray2[29] = 1052438473;
    tmpArray2[30] = 1016535060;
    tmpArray2[31] = 1802137761;
    tmpArray2[32] = 1753167236;
    tmpArray2[33] = 1386275462;
    tmpArray2[34] = -1214491899;
    tmpArray2[35] = -1437595849;
    tmpArray2[36] = 1040679964;
    tmpArray2[37] = 2145300060;
    tmpArray2[38] = -1904392980;
    tmpArray2[39] = 1461121720;
    tmpArray2[40] = -1338320329;
    tmpArray2[41] = -263189491;
    tmpArray2[42] = -266592508;
    tmpArray2[43] = 33600511;
    tmpArray2[44] = -1374882534;
    tmpArray2[45] = 1018524850;
    tmpArray2[46] = 629373528;
    tmpArray2[47] = -603381315;
    tmpArray2[48] = -779021319;
    tmpArray2[49] = 2091462646;
    tmpArray2[50] = -1808644237;
    tmpArray2[51] = 586499841;
    tmpArray2[52] = 988145025;
    tmpArray2[53] = 935516892;
    tmpArray2[54] = -927631820;
    tmpArray2[55] = -1695294041;
    tmpArray2[56] = -1455136442;
    tmpArray2[57] = 265290510;
    tmpArray2[58] = -322386114;
    tmpArray2[59] = -1535828415;
    tmpArray2[60] = -499593831;
    tmpArray2[61] = 1005194799;
    tmpArray2[62] = 847297441;
    tmpArray2[63] = 406762289;
    tmpArray2[64] = 1314163512;
    tmpArray2[65] = 1332590856;
    tmpArray2[66] = 1866599683;
    tmpArray2[67] = -167115585;
    tmpArray2[68] = 750260880;
    tmpArray2[69] = 613907577;
    tmpArray2[70] = 1450815602;
    tmpArray2[71] = -1129346641;
    tmpArray2[72] = -560302305;
    tmpArray2[73] = -644675568;
    tmpArray2[74] = -1282691566;
    tmpArray2[75] = -590397650;
    tmpArray2[76] = 1427272223;
    tmpArray2[77] = 778793252;
    tmpArray2[78] = 1343938022;
    tmpArray2[79] = -1618686585;
    tmpArray2[80] = 2052605720;
    tmpArray2[81] = 1946737175;
    tmpArray2[82] = -1130390852;
    tmpArray2[83] = -380928628;
    tmpArray2[84] = -327488454;
    tmpArray2[85] = -612033030;
    tmpArray2[86] = 1661551462;
    tmpArray2[87] = -1000029230;
    tmpArray2[88] = -283371449;
    tmpArray2[89] = 840292616;
    tmpArray2[90] = -582796489;
    tmpArray2[91] = 616741398;
    tmpArray2[92] = 312560963;
    tmpArray2[93] = 711312465;
    tmpArray2[94] = 1351876610;
    tmpArray2[95] = 322626781;
    tmpArray2[96] = 1910503582;
    tmpArray2[97] = 271666773;
    tmpArray2[98] = -2119403562;
    tmpArray2[99] = 1594956187;
    tmpArray2[100] = 70604529;
    tmpArray2[101] = -677132437;
    tmpArray2[102] = 1007753275;
    tmpArray2[103] = 1495573769;
    tmpArray2[104] = -225450259;
    tmpArray2[105] = -1745748998;
    tmpArray2[106] = -1631928532;
    tmpArray2[107] = 504708206;
    tmpArray2[108] = -2031925904;
    tmpArray2[109] = -353800271;
    tmpArray2[110] = -2045878774;
    tmpArray2[111] = 1514023603;
    tmpArray2[112] = 1998579484;
    tmpArray2[113] = 1312622330;
    tmpArray2[114] = 694541497;
    tmpArray2[115] = -1712906993;
    tmpArray2[116] = -2143385130;
    tmpArray2[117] = 1382467621;
    tmpArray2[118] = 776784248;
    tmpArray2[119] = -1676627094;
    tmpArray2[120] = -971698502;
    tmpArray2[121] = -1797068168;
    tmpArray2[122] = -1510196141;
    tmpArray2[123] = 503983604;
    tmpArray2[124] = -218673497;
    tmpArray2[125] = 907881277;
    tmpArray2[126] = 423175695;
    tmpArray2[127] = 432175456;
    tmpArray2[128] = 1378068232;
    tmpArray2[129] = -149744970;
    tmpArray2[130] = -340918674;
    tmpArray2[131] = -356311194;
    tmpArray2[132] = -474200683;
    tmpArray2[133] = -1501837181;
    tmpArray2[134] = -1317062703;
    tmpArray2[135] = 26017576;
    tmpArray2[136] = -1020076561;
    tmpArray2[137] = -1100195163;
    tmpArray2[138] = 1700274565;
    tmpArray2[139] = 1756076034;
    tmpArray2[140] = -288447217;
    tmpArray2[141] = -617638597;
    tmpArray2[142] = 720338349;
    tmpArray2[143] = 1533947780;
    tmpArray2[144] = 354530856;
    tmpArray2[145] = 688349552;
    tmpArray2[146] = -321042571;
    tmpArray2[147] = 1637815568;
    tmpArray2[148] = 332179504;
    tmpArray2[149] = -345916010;
    tmpArray2[150] = 53804574;
    tmpArray2[151] = -1442618417;
    tmpArray2[152] = -1250730864;
    tmpArray2[153] = 1282449977;
    tmpArray2[154] = -711025141;
    tmpArray2[155] = -877994476;
    tmpArray2[156] = -288586052;
    tmpArray2[157] = 1617046695;
    tmpArray2[158] = -1666491221;
    tmpArray2[159] = -1292663698;
    tmpArray2[160] = 1686838959;
    tmpArray2[161] = 431878346;
    tmpArray2[162] = -1608291911;
    tmpArray2[163] = 1700445008;
    tmpArray2[164] = 1080580658;
    tmpArray2[165] = 1009431731;
    tmpArray2[166] = 832498133;
    tmpArray2[167] = -1071531785;
    tmpArray2[168] = -1688990951;
    tmpArray2[169] = -2023776103;
    tmpArray2[170] = -1778935426;
    tmpArray2[171] = 1648197032;
    tmpArray2[172] = -130578278;
    tmpArray2[173] = -1746719369;
    tmpArray2[174] = 300782431;
    tmpArray2[175] = 375919233;
    tmpArray2[176] = 238389289;
    tmpArray2[177] = -941219882;
    tmpArray2[178] = -1763778655;
    tmpArray2[179] = 2019080857;
    tmpArray2[180] = 1475708069;
    tmpArray2[181] = 455242339;
    tmpArray2[182] = -1685863425;
    tmpArray2[183] = 448939670;
    tmpArray2[184] = -843904277;
    tmpArray2[185] = 1395535956;
    tmpArray2[186] = -1881585436;
    tmpArray2[187] = 1841049896;
    tmpArray2[188] = 1491858159;
    tmpArray2[189] = 885456874;
    tmpArray2[190] = -30872223;
    tmpArray2[191] = -293847949;
    tmpArray2[192] = 1565136089;
    tmpArray2[193] = -396052509;
    tmpArray2[194] = 1108368660;
    tmpArray2[195] = 540939232;
    tmpArray2[196] = 1173283510;
    tmpArray2[197] = -1549095958;
    tmpArray2[198] = -613658859;
    tmpArray2[199] = -87339056;
    tmpArray2[200] = -951913406;
    tmpArray2[201] = -278217803;
    tmpArray2[202] = 1699691293;
    tmpArray2[203] = 1103962373;
    tmpArray2[204] = -669091426;
    tmpArray2[205] = -2038084153;
    tmpArray2[206] = -464828566;
    tmpArray2[207] = 1031889488;
    tmpArray2[208] = -815619598;
    tmpArray2[209] = 1535977030;
    tmpArray2[210] = -58162272;
    tmpArray2[211] = -1043876189;
    tmpArray2[212] = 2132092099;
    tmpArray2[213] = 1774941330;
    tmpArray2[214] = 1199868427;
    tmpArray2[215] = 1452454533;
    tmpArray2[216] = 157007616;
    tmpArray2[217] = -1390851939;
    tmpArray2[218] = 342012276;
    tmpArray2[219] = 595725824;
    tmpArray2[220] = 1480756522;
    tmpArray2[221] = 206960106;
    tmpArray2[222] = 497939518;
    tmpArray2[223] = 591360097;
    tmpArray2[224] = 863170706;
    tmpArray2[225] = -1919713727;
    tmpArray2[226] = -698356495;
    tmpArray2[227] = 1814182875;
    tmpArray2[228] = 2094937945;
    tmpArray2[229] = -873565088;
    tmpArray2[230] = 1082520231;
    tmpArray2[231] = -831049106;
    tmpArray2[232] = -1509457788;
    tmpArray2[233] = 435703966;
    tmpArray2[234] = -386934699;
    tmpArray2[235] = 1641649973;
    tmpArray2[236] = -1452693590;
    tmpArray2[237] = -989067582;
    tmpArray2[238] = 1510255612;
    tmpArray2[239] = -2146710820;
    tmpArray2[240] = -1639679442;
    tmpArray2[241] = -1018874748;
    tmpArray2[242] = -36346107;
    tmpArray2[243] = 236887753;
    tmpArray2[244] = -613164077;
    tmpArray2[245] = 274041037;
    tmpArray2[246] = 1734335097;
    tmpArray2[247] = -479771840;
    tmpArray2[248] = -976997275;
    tmpArray2[249] = 1899903192;
    tmpArray2[250] = 1026095262;
    tmpArray2[251] = -244449504;
    tmpArray2[252] = 356393447;
    tmpArray2[253] = -1884275382;
    tmpArray2[254] = -421290197;
    tmpArray2[255] = -612127241;
    sbox_init_2 = tmpArray2;
    tmpArray3 = new int[256];
    tmpArray3[0] = -381855128;
    tmpArray3[1] = -1803468553;
    tmpArray3[2] = -162781668;
    tmpArray3[3] = -1805047500;
    tmpArray3[4] = 1091903735;
    tmpArray3[5] = 1979897079;
    tmpArray3[6] = -1124832466;
    tmpArray3[7] = -727580568;
    tmpArray3[8] = -737663887;
    tmpArray3[9] = 857797738;
    tmpArray3[10] = 1136121015;
    tmpArray3[11] = 1342202287;
    tmpArray3[12] = 507115054;
    tmpArray3[13] = -1759230650;
    tmpArray3[14] = 337727348;
    tmpArray3[15] = -1081374656;
    tmpArray3[16] = 1301675037;
    tmpArray3[17] = -1766485585;
    tmpArray3[18] = 1895095763;
    tmpArray3[19] = 1721773893;
    tmpArray3[20] = -1078195732;
    tmpArray3[21] = 62756741;
    tmpArray3[22] = 2142006736;
    tmpArray3[23] = 835421444;
    tmpArray3[24] = -1762973773;
    tmpArray3[25] = 1442658625;
    tmpArray3[26] = -635090970;
    tmpArray3[27] = -1412822374;
    tmpArray3[28] = 676362277;
    tmpArray3[29] = 1392781812;
    tmpArray3[30] = 170690266;
    tmpArray3[31] = -373920261;
    tmpArray3[32] = 1759253602;
    tmpArray3[33] = -683120384;
    tmpArray3[34] = 1745797284;
    tmpArray3[35] = 664899054;
    tmpArray3[36] = 1329594018;
    tmpArray3[37] = -393761396;
    tmpArray3[38] = -1249058810;
    tmpArray3[39] = 2062866102;
    tmpArray3[40] = -1429332356;
    tmpArray3[41] = -751345684;
    tmpArray3[42] = -830954599;
    tmpArray3[43] = 1080764994;
    tmpArray3[44] = 553557557;
    tmpArray3[45] = -638351943;
    tmpArray3[46] = -298199125;
    tmpArray3[47] = 991055499;
    tmpArray3[48] = 499776247;
    tmpArray3[49] = 1265440854;
    tmpArray3[50] = 648242737;
    tmpArray3[51] = -354183246;
    tmpArray3[52] = 980351604;
    tmpArray3[53] = -581221582;
    tmpArray3[54] = 1749149687;
    tmpArray3[55] = -898096901;
    tmpArray3[56] = -83167922;
    tmpArray3[57] = -654396521;
    tmpArray3[58] = 1161844396;
    tmpArray3[59] = -1169648345;
    tmpArray3[60] = 1431517754;
    tmpArray3[61] = 545492359;
    tmpArray3[62] = -26498633;
    tmpArray3[63] = -795437749;
    tmpArray3[64] = 1437099964;
    tmpArray3[65] = -1592419752;
    tmpArray3[66] = -861329053;
    tmpArray3[67] = -1713251533;
    tmpArray3[68] = -1507177898;
    tmpArray3[69] = 1060185593;
    tmpArray3[70] = 1593081372;
    tmpArray3[71] = -1876348548;
    tmpArray3[72] = -34019326;
    tmpArray3[73] = 69676912;
    tmpArray3[74] = -2135222948;
    tmpArray3[75] = 86519011;
    tmpArray3[76] = -1782508216;
    tmpArray3[77] = -456757982;
    tmpArray3[78] = 1220612927;
    tmpArray3[79] = -955283748;
    tmpArray3[80] = 133810670;
    tmpArray3[81] = 1090789135;
    tmpArray3[82] = 1078426020;
    tmpArray3[83] = 1569222167;
    tmpArray3[84] = 845107691;
    tmpArray3[85] = -711212847;
    tmpArray3[86] = -222510705;
    tmpArray3[87] = 1091646820;
    tmpArray3[88] = 628848692;
    tmpArray3[89] = 1613405280;
    tmpArray3[90] = -537335645;
    tmpArray3[91] = 526609435;
    tmpArray3[92] = 236106946;
    tmpArray3[93] = 48312990;
    tmpArray3[94] = -1352249391;
    tmpArray3[95] = -892239595;
    tmpArray3[96] = 1797494240;
    tmpArray3[97] = 859738849;
    tmpArray3[98] = 992217954;
    tmpArray3[99] = -289490654;
    tmpArray3[100] = -2051890674;
    tmpArray3[101] = -424014439;
    tmpArray3[102] = -562951028;
    tmpArray3[103] = 765654824;
    tmpArray3[104] = -804095931;
    tmpArray3[105] = -1783130883;
    tmpArray3[106] = 1685915746;
    tmpArray3[107] = -405998096;
    tmpArray3[108] = 1414112111;
    tmpArray3[109] = -2021832454;
    tmpArray3[110] = -1013056217;
    tmpArray3[111] = -214004450;
    tmpArray3[112] = 172450625;
    tmpArray3[113] = -1724973196;
    tmpArray3[114] = 980381355;
    tmpArray3[115] = -185008841;
    tmpArray3[116] = -1475158944;
    tmpArray3[117] = -1578377736;
    tmpArray3[118] = -1726226100;
    tmpArray3[119] = -613520627;
    tmpArray3[120] = -964995824;
    tmpArray3[121] = 1835478071;
    tmpArray3[122] = 660984891;
    tmpArray3[123] = -590288892;
    tmpArray3[124] = -248967737;
    tmpArray3[125] = -872349789;
    tmpArray3[126] = -1254551662;
    tmpArray3[127] = 1762651403;
    tmpArray3[128] = 1719377915;
    tmpArray3[129] = -824476260;
    tmpArray3[130] = -1601057013;
    tmpArray3[131] = -652910941;
    tmpArray3[132] = -1156370552;
    tmpArray3[133] = 1364962596;
    tmpArray3[134] = 2073328063;
    tmpArray3[135] = 1983633131;
    tmpArray3[136] = 926494387;
    tmpArray3[137] = -871278215;
    tmpArray3[138] = -2144935273;
    tmpArray3[139] = -198299347;
    tmpArray3[140] = 1749200295;
    tmpArray3[141] = -966120645;
    tmpArray3[142] = 309677260;
    tmpArray3[143] = 2016342300;
    tmpArray3[144] = 1779581495;
    tmpArray3[145] = -1215147545;
    tmpArray3[146] = 111262694;
    tmpArray3[147] = 1274766160;
    tmpArray3[148] = 443224088;
    tmpArray3[149] = 298511866;
    tmpArray3[150] = 1025883608;
    tmpArray3[151] = -488520759;
    tmpArray3[152] = 1145181785;
    tmpArray3[153] = 168956806;
    tmpArray3[154] = -653464466;
    tmpArray3[155] = -710153686;
    tmpArray3[156] = 1689216846;
    tmpArray3[157] = -628709281;
    tmpArray3[158] = -1094719096;
    tmpArray3[159] = 1692713982;
    tmpArray3[160] = -1648590761;
    tmpArray3[161] = -252198778;
    tmpArray3[162] = 1618508792;
    tmpArray3[163] = 1610833997;
    tmpArray3[164] = -771914938;
    tmpArray3[165] = -164094032;
    tmpArray3[166] = 2001055236;
    tmpArray3[167] = -684262196;
    tmpArray3[168] = -2092799181;
    tmpArray3[169] = -266425487;
    tmpArray3[170] = -1333771897;
    tmpArray3[171] = 1006657119;
    tmpArray3[172] = 2006996926;
    tmpArray3[173] = -1108824540;
    tmpArray3[174] = 1430667929;
    tmpArray3[175] = -1084739999;
    tmpArray3[176] = 1314452623;
    tmpArray3[177] = -220332638;
    tmpArray3[178] = -193663176;
    tmpArray3[179] = -2021016126;
    tmpArray3[180] = 1399257539;
    tmpArray3[181] = -927756684;
    tmpArray3[182] = -1267338667;
    tmpArray3[183] = 1190975929;
    tmpArray3[184] = 2062231137;
    tmpArray3[185] = -1960976508;
    tmpArray3[186] = -2073424263;
    tmpArray3[187] = -1856006686;
    tmpArray3[188] = 1181637006;
    tmpArray3[189] = 548689776;
    tmpArray3[190] = -1932175983;
    tmpArray3[191] = -922558900;
    tmpArray3[192] = -1190417183;
    tmpArray3[193] = -1149106736;
    tmpArray3[194] = 296247880;
    tmpArray3[195] = 1970579870;
    tmpArray3[196] = -1216407114;
    tmpArray3[197] = -525738999;
    tmpArray3[198] = 1714227617;
    tmpArray3[199] = -1003338189;
    tmpArray3[200] = -396747006;
    tmpArray3[201] = 166772364;
    tmpArray3[202] = 1251581989;
    tmpArray3[203] = 493813264;
    tmpArray3[204] = 448347421;
    tmpArray3[205] = 195405023;
    tmpArray3[206] = -1584991729;
    tmpArray3[207] = 677966185;
    tmpArray3[208] = -591930749;
    tmpArray3[209] = 1463355134;
    tmpArray3[210] = -1578971493;
    tmpArray3[211] = 1338867538;
    tmpArray3[212] = 1343315457;
    tmpArray3[213] = -1492745222;
    tmpArray3[214] = -1610435132;
    tmpArray3[215] = 233230375;
    tmpArray3[216] = -1694987225;
    tmpArray3[217] = 2000651841;
    tmpArray3[218] = -1017099258;
    tmpArray3[219] = 1638401717;
    tmpArray3[220] = -266896856;
    tmpArray3[221] = -1057650976;
    tmpArray3[222] = 6314154;
    tmpArray3[223] = 819756386;
    tmpArray3[224] = 300326615;
    tmpArray3[225] = 590932579;
    tmpArray3[226] = 1405279636;
    tmpArray3[227] = -1027467724;
    tmpArray3[228] = -1144263082;
    tmpArray3[229] = -1866680610;
    tmpArray3[230] = -335774303;
    tmpArray3[231] = -833020554;
    tmpArray3[232] = 1862657033;
    tmpArray3[233] = 1266418056;
    tmpArray3[234] = 963775037;
    tmpArray3[235] = 2089974820;
    tmpArray3[236] = -2031914401;
    tmpArray3[237] = 1917689273;
    tmpArray3[238] = 448879540;
    tmpArray3[239] = -744572676;
    tmpArray3[240] = -313240200;
    tmpArray3[241] = 150775221;
    tmpArray3[242] = -667058989;
    tmpArray3[243] = 1303187396;
    tmpArray3[244] = 508620638;
    tmpArray3[245] = -1318983944;
    tmpArray3[246] = -1568336679;
    tmpArray3[247] = 1817252668;
    tmpArray3[248] = 1876281319;
    tmpArray3[249] = 1457606340;
    tmpArray3[250] = 908771278;
    tmpArray3[251] = -574175177;
    tmpArray3[252] = -677760460;
    tmpArray3[253] = -1838972398;
    tmpArray3[254] = 1729034894;
    tmpArray3[255] = 1080033504;
    sbox_init_3 = tmpArray3;
    tmpArray4 = new int[256];
    tmpArray4[0] = 976866871;
    tmpArray4[1] = -738527793;
    tmpArray4[2] = -1413318857;
    tmpArray4[3] = 1522871579;
    tmpArray4[4] = 1555064734;
    tmpArray4[5] = 1336096578;
    tmpArray4[6] = -746444992;
    tmpArray4[7] = -1715692610;
    tmpArray4[8] = -720269667;
    tmpArray4[9] = -1089506539;
    tmpArray4[10] = -701686658;
    tmpArray4[11] = -956251013;
    tmpArray4[12] = -1215554709;
    tmpArray4[13] = 564236357;
    tmpArray4[14] = -1301368386;
    tmpArray4[15] = 1781952180;
    tmpArray4[16] = 1464380207;
    tmpArray4[17] = -1131123079;
    tmpArray4[18] = -962365742;
    tmpArray4[19] = 1699332808;
    tmpArray4[20] = 1393555694;
    tmpArray4[21] = 1183702653;
    tmpArray4[22] = -713881059;
    tmpArray4[23] = 1288719814;
    tmpArray4[24] = 691649499;
    tmpArray4[25] = -1447410096;
    tmpArray4[26] = -1399511320;
    tmpArray4[27] = -1101077756;
    tmpArray5 = new int[256];
    tmpArray5[28] = -1577396752;
    tmpArray5[29] = 1781354906;
    tmpArray6 = new int[256];
    tmpArray6[30] = 1676643554;
    tmpArray6[31] = -1702433246;
    tmpArray6[32] = -1064713544;
    tmpArray7 = new int[256];
    tmpArray7[33] = 1126444790;
    tmpArray7[34] = -1524759638;
    new int[256][35] = -1661808476;
    tmpArray8 = new int[256];
    tmpArray8[36] = -2084544070;
    tmpArray8[37] = -1679201715;
    tmpArray9 = new int[256];
    tmpArray9[38] = -1880812208;
    tmpArray9[39] = -1167828010;
    tmpArray9[40] = 673620729;
    tmpArray10 = new int[256];
    tmpArray10[41] = -1489356063;
    tmpArray10[42] = 1269405062;
    new int[256][43] = -279616791;
    tmpArray11 = new int[256];
    tmpArray11[44] = -953159725;
    tmpArray11[45] = -145557542;
    tmpArray11[46] = 1057255273;
    tmpArray11[47] = 2012875353;
    tmpArray11[48] = -2132498155;
    tmpArray11[49] = -2018474495;
    tmpArray11[50] = -1693849939;
    tmpArray11[51] = 993977747;
    tmpArray11[52] = -376373926;
    tmpArray11[53] = -1640704105;
    tmpArray11[54] = 753973209;
    tmpArray11[55] = 36408145;
    tmpArray11[56] = -1764381638;
    tmpArray11[57] = 25011837;
    tmpArray11[58] = -774947114;
    tmpArray11[59] = 2088578344;
    tmpArray11[60] = 530523599;
    tmpArray11[61] = -1376601957;
    tmpArray11[62] = 1524020338;
    tmpArray11[63] = 1518925132;
    tmpArray11[64] = -534139791;
    tmpArray11[65] = -535190042;
    tmpArray11[66] = 1202760957;
    tmpArray11[67] = -309069157;
    tmpArray11[68] = -388774771;
    tmpArray11[69] = 674977740;
    tmpArray11[70] = -120232407;
    tmpArray11[71] = 2031300136;
    tmpArray11[72] = 2019492241;
    tmpArray11[73] = -311074731;
    tmpArray11[74] = -141160892;
    tmpArray11[75] = -472686964;
    tmpArray11[76] = 352677332;
    tmpArray11[77] = -1997247046;
    tmpArray11[78] = 60907813;
    tmpArray11[79] = 90501309;
    tmpArray11[80] = -1007968747;
    tmpArray11[81] = 1016092578;
    tmpArray11[82] = -1759044884;
    tmpArray11[83] = -1455814870;
    tmpArray11[84] = 457141659;
    tmpArray11[85] = 509813237;
    tmpArray11[86] = -174299397;
    tmpArray11[87] = 652014361;
    tmpArray11[88] = 1966332200;
    tmpArray11[89] = -1319764491;
    tmpArray11[90] = 55981186;
    tmpArray11[91] = -1967506245;
    tmpArray11[92] = 676427537;
    tmpArray11[93] = -1039476232;
    tmpArray11[94] = -1412673177;
    tmpArray11[95] = -861040033;
    tmpArray11[96] = 1307055953;
    tmpArray11[97] = 942726286;
    tmpArray11[98] = 933058658;
    tmpArray11[99] = -1826555503;
    tmpArray11[100] = -361066302;
    tmpArray11[101] = -79791154;
    tmpArray11[102] = 1361170020;
    tmpArray11[103] = 2001714738;
    tmpArray11[104] = -1464409218;
    tmpArray11[105] = -1020707514;
    tmpArray11[106] = 1222529897;
    tmpArray11[107] = 1679025792;
    tmpArray11[108] = -1565652976;
    tmpArray11[109] = -580013532;
    tmpArray11[110] = 1770335741;
    tmpArray11[111] = 151462246;
    tmpArray11[112] = -1281735158;
    tmpArray11[113] = 1682292957;
    tmpArray11[114] = 1483529935;
    tmpArray11[115] = 471910574;
    tmpArray11[116] = 1539241949;
    tmpArray11[117] = 458788160;
    tmpArray11[118] = -858652289;
    tmpArray11[119] = 1807016891;
    tmpArray11[120] = -576558466;
    tmpArray11[121] = 978976581;
    tmpArray11[122] = 1043663428;
    tmpArray11[123] = -1129001515;
    tmpArray11[124] = 1927990952;
    tmpArray11[125] = -94075717;
    tmpArray11[126] = -1922690386;
    tmpArray11[127] = -1086558393;
    tmpArray11[128] = -761535389;
    tmpArray11[129] = 1412390302;
    tmpArray11[130] = -1362987237;
    tmpArray11[131] = -162634896;
    tmpArray11[132] = 1947078029;
    tmpArray11[133] = -413461673;
    tmpArray11[134] = -126740879;
    tmpArray11[135] = -1353482915;
    tmpArray11[136] = 1077988104;
    tmpArray11[137] = 1320477388;
    tmpArray11[138] = 886195818;
    tmpArray11[139] = 18198404;
    tmpArray11[140] = -508558296;
    tmpArray11[141] = -1785185763;
    tmpArray11[142] = 112762804;
    tmpArray11[143] = -831610808;
    tmpArray11[144] = 1866414978;
    tmpArray11[145] = 891333506;
    tmpArray11[146] = 18488651;
    tmpArray11[147] = 661792760;
    tmpArray11[148] = 1628790961;
    tmpArray11[149] = -409780260;
    tmpArray11[150] = -1153795797;
    tmpArray11[151] = 876946877;
    tmpArray11[152] = -1601685023;
    tmpArray11[153] = 1372485963;
    tmpArray11[154] = 791857591;
    tmpArray11[155] = -1608533303;
    tmpArray11[156] = -534984578;
    tmpArray11[157] = -1127755274;
    tmpArray11[158] = -822013501;
    tmpArray11[159] = -1578587449;
    tmpArray11[160] = 445679433;
    tmpArray11[161] = -732971622;
    tmpArray11[162] = -790962485;
    tmpArray11[163] = -720709064;
    tmpArray11[164] = 54117162;
    tmpArray11[165] = -963561881;
    tmpArray11[166] = -1913048708;
    tmpArray11[167] = -525259953;
    tmpArray11[168] = -140617289;
    tmpArray11[169] = 1140177722;
    tmpArray11[170] = -220915201;
    tmpArray11[171] = 668550556;
    tmpArray11[172] = -1080614356;
    tmpArray11[173] = 367459370;
    tmpArray11[174] = 261225585;
    tmpArray11[175] = -1684794075;
    tmpArray11[176] = -85617823;
    tmpArray11[177] = -826893077;
    tmpArray11[178] = -1029151655;
    tmpArray11[179] = 314222801;
    tmpArray11[180] = -1228863650;
    tmpArray11[181] = -486184436;
    tmpArray11[182] = 282218597;
    tmpArray11[183] = -888953790;
    tmpArray11[184] = -521376242;
    tmpArray11[185] = 379116347;
    tmpArray11[186] = 1285071038;
    tmpArray11[187] = 846784868;
    tmpArray11[188] = -1625320142;
    tmpArray11[189] = -523005217;
    tmpArray11[190] = -744475605;
    tmpArray11[191] = -1989021154;
    tmpArray11[192] = 453669953;
    tmpArray11[193] = 1268987020;
    tmpArray11[194] = -977374944;
    tmpArray11[195] = -1015663912;
    tmpArray11[196] = -550133875;
    tmpArray11[197] = -1684459730;
    tmpArray11[198] = -435458233;
    tmpArray11[199] = 266596637;
    tmpArray11[200] = -447948204;
    tmpArray11[201] = 517658769;
    tmpArray11[202] = -832407089;
    tmpArray11[203] = -851542417;
    tmpArray11[204] = 370717030;
    tmpArray11[205] = -47440635;
    tmpArray11[206] = -2070949179;
    tmpArray11[207] = -151313767;
    tmpArray11[208] = -182193321;
    tmpArray11[209] = -1506642397;
    tmpArray11[210] = -1817692879;
    tmpArray11[211] = 1456262402;
    tmpArray11[212] = -1393524382;
    tmpArray11[213] = 1517677493;
    tmpArray11[214] = 1846949527;
    tmpArray11[215] = -1999473716;
    tmpArray11[216] = -560569710;
    tmpArray11[217] = -2118563376;
    tmpArray11[218] = 1280348187;
    tmpArray11[219] = 1908823572;
    tmpArray11[220] = -423180355;
    tmpArray11[221] = 846861322;
    tmpArray11[222] = 1172426758;
    tmpArray11[223] = -1007518822;
    tmpArray11[224] = -911584259;
    tmpArray11[225] = 1655181056;
    tmpArray11[226] = -1155153950;
    tmpArray11[227] = 901632758;
    tmpArray11[228] = 1897031941;
    tmpArray11[229] = -1308360158;
    tmpArray11[230] = -1228157060;
    tmpArray11[231] = -847864789;
    tmpArray11[232] = 1393639104;
    tmpArray11[233] = 373351379;
    tmpArray11[234] = 950779232;
    tmpArray11[235] = 625454576;
    tmpArray11[236] = -1170726756;
    tmpArray11[237] = -146354570;
    tmpArray11[238] = 2007998917;
    tmpArray11[239] = 544563296;
    tmpArray11[240] = -2050228658;
    tmpArray11[241] = -1964470824;
    tmpArray11[242] = 2058025392;
    tmpArray11[243] = 1291430526;
    tmpArray11[244] = 424198748;
    tmpArray11[245] = 50039436;
    tmpArray11[246] = 29584100;
    tmpArray11[247] = -689184263;
    tmpArray11[248] = -1865090967;
    tmpArray11[249] = -1503863136;
    tmpArray11[250] = 1057563949;
    tmpArray11[251] = -1039604065;
    tmpArray11[252] = -1219600078;
    tmpArray11[253] = -831004069;
    tmpArray11[254] = 1469046755;
    tmpArray11[255] = 985887462;
    sbox_init_4 = tmpArray11;
  }
}
