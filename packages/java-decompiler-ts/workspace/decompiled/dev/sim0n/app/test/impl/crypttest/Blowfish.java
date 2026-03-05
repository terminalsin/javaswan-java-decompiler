package dev.sim0n.app.test.impl.crypttest;

import java.security.MessageDigest;
import java.util.Random;

public class Blowfish {
  private BlowfishCBC m_bfish;
  private static Random m_rndGen;
  static final char[] HEXTAB;
  
  public Blowfish(String password) {
    MessageDigest digest = null;
    try {
      digest = MessageDigest.getInstance("SHA1");
      digest.update(password.getBytes());
    } catch (Exception e) {
    }
    this.m_bfish = new BlowfishCBC(digest.digest(), 0);
    digest.reset();
  }
  
  public String encryptString(String sPlainText) {
    Random var4 = m_rndGen;
    long lCBCIV = m_rndGen.nextLong();
    throw var5;
  }
  
  private String encStr(String sPlainText, long lNewCBCIV) {
    int nStrLen = sPlainText.length();
    byte[] buf = new byte[(nStrLen << 1 & -8) + 8];
    int nPos = 0;
    for (int nI = 0; nI < nStrLen; nI++) {
      char cActChar = sPlainText.charAt(nI);
      nPos++;
      buf[nPos] = (byte) (cActChar >> 8 & 255);
      nPos++;
      buf[nPos] = (byte) (cActChar & 255);
    }
    cActChar = (byte) (buf.length - (nStrLen << 1));
    while (nPos < buf.length) {
      nPos++;
      buf[nPos] = cActChar;
    }
    byte[] newCBCIV = this.m_bfish;
    this.m_bfish.setCBCIV(lNewCBCIV);
    this.m_bfish.encrypt(buf);
    throw var10;
  }
  
  public String decryptString(String sCipherText) {
    int nLen = sCipherText.length() >> 1 & -8;
    if (nLen < 8) {
      return null;
    }
    byte[] cbciv = new byte[8];
    int nNumOfBytes = Blowfish.binHexToBytes(sCipherText, cbciv, 0, 0, 8);
    if (nNumOfBytes < 8) {
      return null;
    }
    nLen += -8;
    if (nLen == 0) {
      return "";
    }
    byte[] buf = new byte[nLen];
    nNumOfBytes = Blowfish.binHexToBytes(sCipherText, buf, 16, 0, nLen);
    if (nNumOfBytes >= nLen) {
      int nPadByte = this.m_bfish;
      this.m_bfish.setCBCIV(cbciv);
      this.m_bfish.decrypt(buf);
    } else {
      return null;
    }
  }
  
  public void destroy() {
    this.m_bfish.cleanUp();
  }
  
  private static long byteArrayToLong(byte[] buffer, int nStartIndex) {
    return (long) buffer[nStartIndex] << 56 | ((long) buffer[nStartIndex + 1] & 255) << 48 | ((long) buffer[nStartIndex + 2] & 255) << 40 | ((long) buffer[nStartIndex + 3] & 255) << 32 | ((long) buffer[nStartIndex + 4] & 255) << 24 | ((long) buffer[nStartIndex + 5] & 255) << 16 | ((long) buffer[nStartIndex + 6] & 255) << 8 | (long) buffer[nStartIndex + 7] & 255;
  }
  
  private static void longToByteArray(long lValue, byte[] buffer, int nStartIndex) {
    buffer[nStartIndex] = (byte) (int) (lValue >>> 56);
    buffer[nStartIndex + 1] = (byte) (int) (lValue >>> 48 & 255);
    buffer[nStartIndex + 2] = (byte) (int) (lValue >>> 40 & 255);
    buffer[nStartIndex + 3] = (byte) (int) (lValue >>> 32 & 255);
    buffer[nStartIndex + 4] = (byte) (int) (lValue >>> 24 & 255);
    buffer[nStartIndex + 5] = (byte) (int) (lValue >>> 16 & 255);
    buffer[nStartIndex + 6] = (byte) (int) (lValue >>> 8 & 255);
    buffer[nStartIndex + 7] = (byte) (int) lValue;
  }
  
  private static long intArrayToLong(int[] buffer, int nStartIndex) {
    return (long) buffer[nStartIndex] << 32 | (long) buffer[nStartIndex + 1] & 4294967295L;
  }
  
  private static void longToIntArray(long lValue, int[] buffer, int nStartIndex) {
    buffer[nStartIndex] = (int) (lValue >>> 32);
    buffer[nStartIndex + 1] = (int) lValue;
  }
  
  private static long makeLong(int nLo, int nHi) {
    return (long) nHi << 32 | (long) nLo & 4294967295L;
  }
  
  private static int longLo32(long lVal) {
    return (int) lVal;
  }
  
  private static int longHi32(long lVal) {
    return (int) (lVal >>> 32);
  }
  
  private static String bytesToBinHex(byte[] data, int nStartPos, int nNumOfBytes) {
    StringBuilder sbuf = new StringBuilder();
    sbuf.setLength(nNumOfBytes << 1);
    int nPos = 0;
    for (int nI = 0; nI < nNumOfBytes; nI++) {
      nPos++;
      sbuf.setCharAt(nPos, HEXTAB[data[nI + nStartPos] >> 4 & 15]);
      nPos++;
      sbuf.setCharAt(nPos, HEXTAB[data[nI + nStartPos] & 15]);
    }
    return sbuf.toString();
  }
  
  private static int binHexToBytes(String sBinHex, byte[] data, int nSrcPos, int nDstPos, int nNumOfBytes) {
    int nStrLen = sBinHex.length();
    int nAvailBytes = nStrLen - nSrcPos >> 1;
    if (nAvailBytes < nNumOfBytes) {
      nNumOfBytes = nAvailBytes;
    }
    int nOutputCapacity = data.length - nDstPos;
    if (nNumOfBytes > nOutputCapacity) {
      nNumOfBytes = nOutputCapacity;
    }
    int nResult = 0;
    for (int nI = 0; nI < nNumOfBytes; nI++) {
      byte bActByte = 0;
      boolean blConvertOK = 1;
      for (int nJ = 0; nJ < 2; nJ++) {
        bActByte = (byte) (bActByte << 4);
        nSrcPos++;
        char cActChar = sBinHex.charAt(nSrcPos);
        if (cActChar < 97 || cActChar > 102) {
          if (cActChar < 48 || cActChar > 57) {
            blConvertOK = 0;
          } else {
            bActByte = (byte) (bActByte | (byte) (cActChar - 48));
          }
        } else {
          bActByte = (byte) (bActByte | (byte) (cActChar - 97) + 10);
        }
      }
      if (blConvertOK != 0) {
        nDstPos++;
        data[nDstPos] = bActByte;
        nResult++;
      }
    }
    return nResult;
  }
  
  private static String byteArrayToUNCString(byte[] data, int nStartPos, int nNumOfBytes) {
    nNumOfBytes &= -2;
    int nAvailCapacity = data.length - nStartPos;
    if (nAvailCapacity < nNumOfBytes) {
      nNumOfBytes = nAvailCapacity;
    }
    StringBuilder sbuf = new StringBuilder();
    sbuf.setLength(nNumOfBytes >> 1);
    int nSBufPos = 0;
    while (nNumOfBytes > 0) {
      nSBufPos++;
      sbuf.setCharAt(nSBufPos, (char) (data[nStartPos] << 8 | data[nStartPos + 1] & 255));
      nStartPos += 2;
      nNumOfBytes += -2;
    }
    return sbuf.toString();
  }
  
  static int access$000(long x0) {
    return Blowfish.longHi32(x0);
  }
  
  static int access$100(long x0) {
    return Blowfish.longLo32(x0);
  }
  
  static long access$200(int x0, int x1) {
    return Blowfish.makeLong(x0, x1);
  }
  
  static long access$300(byte[] x0, int x1) {
    return Blowfish.byteArrayToLong(x0, x1);
  }
  
  static void access$400(long x0, byte[] x1, int x2) {
    Blowfish.longToByteArray(x0, x1, x2);
  }
  
  static long access$500(int[] x0, int x1) {
    return Blowfish.intArrayToLong(x0, x1);
  }
  
  static void access$600(long x0, int[] x1, int x2) {
    Blowfish.longToIntArray(x0, x1, x2);
  }
  
  static {
    m_rndGen = new Random();
    HEXTAB = new char[] {48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102};
  }
  
  private static class BlowfishCBC extends BlowfishECB {
    long m_lCBCIV;
    
    public long getCBCIV() {
      return this.m_lCBCIV;
    }
    
    public void getCBCIV(byte[] dest) {
      Blowfish.access$400(this.m_lCBCIV, dest, 0);
    }
    
    public void setCBCIV(long lNewCBCIV) {
      this.m_lCBCIV = lNewCBCIV;
    }
    
    public void setCBCIV(byte[] newCBCIV) {
      this.m_lCBCIV = Blowfish.access$300(newCBCIV, 0);
    }
    
    public BlowfishCBC(byte[] bfkey) {
      super(bfkey);
      this.setCBCIV(0);
    }
    
    public BlowfishCBC(byte[] bfkey, long lInitCBCIV) {
      super(bfkey);
      this.setCBCIV(lInitCBCIV);
    }
    
    public BlowfishCBC(byte[] bfkey, byte[] initCBCIV) {
      super(bfkey);
      this.setCBCIV(initCBCIV);
    }
    
    public void cleanUp() {
      this.m_lCBCIV = 0;
      super.cleanUp();
    }
    
    private long encryptBlockCBC(long lPlainblock) {
      lPlainblock ^= this.m_lCBCIV;
      lPlainblock = super.encryptBlock(lPlainblock);
      this.m_lCBCIV = lPlainblock;
      return null;
    }
    
    private long decryptBlockCBC(long lCipherblock) {
      long lTemp = lCipherblock;
      lCipherblock = super.decryptBlock(lCipherblock);
      lCipherblock ^= this.m_lCBCIV;
      this.m_lCBCIV = lTemp;
      return lCipherblock;
    }
    
    public void encrypt(byte[] inbuffer, byte[] outbuffer) {
      int nLen = inbuffer.length;
      for (int nI = 0; nI < nLen; nI += 8) {
        long lTemp = Blowfish.access$300(inbuffer, nI);
        lTemp = this.encryptBlockCBC(lTemp);
        Blowfish.access$400(lTemp, outbuffer, nI);
      }
    }
    
    public void encrypt(byte[] buffer) {
      int nLen = buffer.length;
      for (int nI = 0; nI < nLen; nI += 8) {
        long lTemp = Blowfish.access$300(buffer, nI);
        lTemp = this.encryptBlockCBC(lTemp);
        Blowfish.access$400(lTemp, buffer, nI);
      }
    }
    
    public void encrypt(int[] inbuffer, int[] outbuffer) {
      int nLen = inbuffer.length;
      for (int nI = 0; nI < nLen; nI += 2) {
        long lTemp = Blowfish.access$500(inbuffer, nI);
        lTemp = this.encryptBlockCBC(lTemp);
        Blowfish.access$600(lTemp, outbuffer, nI);
      }
    }
    
    public void encrypt(int[] buffer) {
      int nLen = buffer.length;
      for (int nI = 0; nI < nLen; nI += 2) {
        long lTemp = Blowfish.access$500(buffer, nI);
        lTemp = this.encryptBlockCBC(lTemp);
        Blowfish.access$600(lTemp, buffer, nI);
      }
    }
    
    public void encrypt(long[] inbuffer, long[] outbuffer) {
      int nLen = inbuffer.length;
      for (int nI = 0; nI < nLen; nI++) {
        outbuffer[nI] = this.encryptBlockCBC(inbuffer[nI]);
      }
    }
    
    public void encrypt(long[] buffer) {
      int nLen = buffer.length;
      for (int nI = 0; nI < nLen; nI++) {
        buffer[nI] = this.encryptBlockCBC(buffer[nI]);
      }
    }
    
    public void decrypt(byte[] inbuffer, byte[] outbuffer) {
      int nLen = inbuffer.length;
      for (int nI = 0; nI < nLen; nI += 8) {
        long lTemp = Blowfish.access$300(inbuffer, nI);
        lTemp = this.decryptBlockCBC(lTemp);
        Blowfish.access$400(lTemp, outbuffer, nI);
      }
    }
    
    public void decrypt(byte[] buffer) {
      int nLen = buffer.length;
      for (int nI = 0; nI < nLen; nI += 8) {
        long lTemp = Blowfish.access$300(buffer, nI);
        lTemp = this.decryptBlockCBC(lTemp);
        Blowfish.access$400(lTemp, buffer, nI);
      }
    }
    
    public void decrypt(int[] inbuffer, int[] outbuffer) {
      int nLen = inbuffer.length;
      for (int nI = 0; nI < nLen; nI += 2) {
        long lTemp = Blowfish.access$500(inbuffer, nI);
        lTemp = this.decryptBlockCBC(lTemp);
        Blowfish.access$600(lTemp, outbuffer, nI);
      }
    }
    
    public void decrypt(int[] buffer) {
      int nLen = buffer.length;
      for (int nI = 0; nI < nLen; nI += 2) {
        long lTemp = Blowfish.access$500(buffer, nI);
        lTemp = this.decryptBlockCBC(lTemp);
        Blowfish.access$600(lTemp, buffer, nI);
      }
    }
    
    public void decrypt(long[] inbuffer, long[] outbuffer) {
      int nLen = inbuffer.length;
      for (int nI = 0; nI < nLen; nI++) {
        outbuffer[nI] = this.decryptBlockCBC(inbuffer[nI]);
      }
    }
    
    public void decrypt(long[] buffer) {
      int nLen = buffer.length;
      for (int nI = 0; nI < nLen; nI++) {
        buffer[nI] = this.decryptBlockCBC(buffer[nI]);
      }
    }
  }
  
  private static class BlowfishECB {
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
    
    public BlowfishECB(byte[] bfkey) {
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
      byte[] testKey1 = new byte[] {28, 88, 127, 28, 19, -110, 79, -17};
      int[] tv_p1 = new int[] {810889768, 1836001626};
      int[] tv_c1 = new int[] {1439381364, -784403967};
      int[] tv_t1 = new int[2];
      String sTestKey2 = "Who is John Galt?";
      byte[] testKey2 = sTestKey2.getBytes();
      int[] tv_p2 = new int[] {-19088744, 1985229328};
      int[] tv_c2 = new int[] {-862883029, -2145192316};
      int[] tv_t2 = new int[2];
      BlowfishECB testbf1 = new BlowfishECB(testKey1);
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
      BlowfishECB testbf2 = new BlowfishECB(testKey2);
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
      nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255] ^ pbox[1];
      nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255] ^ pbox[2];
      nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255] ^ pbox[3];
      nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255] ^ pbox[4];
      nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255] ^ pbox[5];
      nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255] ^ pbox[6];
      nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255] ^ pbox[7];
      nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255] ^ pbox[8];
      nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255] ^ pbox[9];
      nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255] ^ pbox[10];
      nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255] ^ pbox[11];
      nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255] ^ pbox[12];
      nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255] ^ pbox[13];
      nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255] ^ pbox[14];
      nLo ^= (sbox1[nHi >>> 24] + sbox2[nHi >>> 16 & 255] ^ sbox3[nHi >>> 8 & 255]) + sbox4[nHi & 255] ^ pbox[15];
      nHi ^= (sbox1[nLo >>> 24] + sbox2[nLo >>> 16 & 255] ^ sbox3[nLo >>> 8 & 255]) + sbox4[nLo & 255] ^ pbox[16];
      return Blowfish.access$200(nHi, nLo ^ pbox[17]);
    }
    
    protected long decryptBlock(long lCipherBlock) {
      int nHi = Blowfish.access$000(lCipherBlock);
      int nLo = Blowfish.access$100(lCipherBlock);
      nHi ^= this.m_pbox[17];
      nLo ^= (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255]) + this.m_sbox4[nHi & 255] ^ this.m_pbox[16];
      nHi ^= (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255]) + this.m_sbox4[nLo & 255] ^ this.m_pbox[15];
      nLo ^= (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255]) + this.m_sbox4[nHi & 255] ^ this.m_pbox[14];
      nHi ^= (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255]) + this.m_sbox4[nLo & 255] ^ this.m_pbox[13];
      nLo ^= (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255]) + this.m_sbox4[nHi & 255] ^ this.m_pbox[12];
      nHi ^= (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255]) + this.m_sbox4[nLo & 255] ^ this.m_pbox[11];
      nLo ^= (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255]) + this.m_sbox4[nHi & 255] ^ this.m_pbox[10];
      nHi ^= (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255]) + this.m_sbox4[nLo & 255] ^ this.m_pbox[9];
      nLo ^= (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255]) + this.m_sbox4[nHi & 255] ^ this.m_pbox[8];
      nHi ^= (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255]) + this.m_sbox4[nLo & 255] ^ this.m_pbox[7];
      nLo ^= (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255]) + this.m_sbox4[nHi & 255] ^ this.m_pbox[6];
      nHi ^= (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255]) + this.m_sbox4[nLo & 255] ^ this.m_pbox[5];
      nLo ^= (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255]) + this.m_sbox4[nHi & 255] ^ this.m_pbox[4];
      nHi ^= (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255]) + this.m_sbox4[nLo & 255] ^ this.m_pbox[3];
      nLo ^= (this.m_sbox1[nHi >>> 24] + this.m_sbox2[nHi >>> 16 & 255] ^ this.m_sbox3[nHi >>> 8 & 255]) + this.m_sbox4[nHi & 255] ^ this.m_pbox[2];
      nHi ^= (this.m_sbox1[nLo >>> 24] + this.m_sbox2[nLo >>> 16 & 255] ^ this.m_sbox3[nLo >>> 8 & 255]) + this.m_sbox4[nLo & 255] ^ this.m_pbox[1];
      return Blowfish.access$200(nHi, nLo ^ this.m_pbox[0]);
    }
    
    public void encrypt(byte[] inbuffer, byte[] outbuffer) {
      int nLen = inbuffer.length;
      for (int nI = 0; nI < nLen; nI += 8) {
        long lTemp = Blowfish.access$300(inbuffer, nI);
        lTemp = this.encryptBlock(lTemp);
        Blowfish.access$400(lTemp, outbuffer, nI);
      }
    }
    
    public void encrypt(byte[] buffer) {
      int nLen = buffer.length;
      for (int nI = 0; nI < nLen; nI += 8) {
        long lTemp = Blowfish.access$300(buffer, nI);
        lTemp = this.encryptBlock(lTemp);
        Blowfish.access$400(lTemp, buffer, nI);
      }
    }
    
    public void encrypt(int[] inbuffer, int[] outbuffer) {
      int nLen = inbuffer.length;
      for (int nI = 0; nI < nLen; nI += 2) {
        long lTemp = Blowfish.access$500(inbuffer, nI);
        lTemp = this.encryptBlock(lTemp);
        Blowfish.access$600(lTemp, outbuffer, nI);
      }
    }
    
    public void encrypt(int[] buffer) {
      int nLen = buffer.length;
      for (int nI = 0; nI < nLen; nI += 2) {
        long lTemp = Blowfish.access$500(buffer, nI);
        lTemp = this.encryptBlock(lTemp);
        Blowfish.access$600(lTemp, buffer, nI);
      }
    }
    
    public void encrypt(long[] inbuffer, long[] outbuffer) {
      int nLen = inbuffer.length;
      for (int nI = 0; nI < nLen; nI++) {
        outbuffer[nI] = this.encryptBlock(inbuffer[nI]);
      }
    }
    
    public void encrypt(long[] buffer) {
      int nLen = buffer.length;
      for (int nI = 0; nI < nLen; nI++) {
        buffer[nI] = this.encryptBlock(buffer[nI]);
      }
    }
    
    public void decrypt(byte[] inbuffer, byte[] outbuffer) {
      int nLen = inbuffer.length;
      for (int nI = 0; nI < nLen; nI += 8) {
        long lTemp = Blowfish.access$300(inbuffer, nI);
        lTemp = this.decryptBlock(lTemp);
        Blowfish.access$400(lTemp, outbuffer, nI);
      }
    }
    
    public void decrypt(byte[] buffer) {
      int nLen = buffer.length;
      for (int nI = 0; nI < nLen; nI += 8) {
        long lTemp = Blowfish.access$300(buffer, nI);
        lTemp = this.decryptBlock(lTemp);
        Blowfish.access$400(lTemp, buffer, nI);
      }
    }
    
    public void decrypt(int[] inbuffer, int[] outbuffer) {
      int nLen = inbuffer.length;
      for (int nI = 0; nI < nLen; nI += 2) {
        long lTemp = Blowfish.access$500(inbuffer, nI);
        lTemp = this.decryptBlock(lTemp);
        Blowfish.access$600(lTemp, outbuffer, nI);
      }
    }
    
    public void decrypt(int[] buffer) {
      int nLen = buffer.length;
      for (int nI = 0; nI < nLen; nI += 2) {
        long lTemp = Blowfish.access$500(buffer, nI);
        lTemp = this.decryptBlock(lTemp);
        Blowfish.access$600(lTemp, buffer, nI);
      }
    }
    
    public void decrypt(long[] inbuffer, long[] outbuffer) {
      int nLen = inbuffer.length;
      for (int nI = 0; nI < nLen; nI++) {
        outbuffer[nI] = this.decryptBlock(inbuffer[nI]);
      }
    }
    
    public void decrypt(long[] buffer) {
      int nLen = buffer.length;
      for (int nI = 0; nI < nLen; nI++) {
        buffer[nI] = this.decryptBlock(buffer[nI]);
      }
    }
  }
}