package dev.sim0n.app.test.impl.crypttest;

class Blowfish$BlowfishCBC extends Blowfish$BlowfishECB {
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

  public Blowfish$BlowfishCBC(byte[] bfkey) {
    super(bfkey);
    this.setCBCIV(0);
  }

  public Blowfish$BlowfishCBC(byte[] bfkey, long lInitCBCIV) {
    super(bfkey);
    this.setCBCIV(lInitCBCIV);
  }

  public Blowfish$BlowfishCBC(byte[] bfkey, byte[] initCBCIV) {
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
    while (nI < nLen) {
      long lTemp = Blowfish.access$300(inbuffer, nI);
      lTemp = this.encryptBlockCBC(lTemp);
      Blowfish.access$400(lTemp, outbuffer, nI);
      int nI = nI + 8;
    }
  }

  public void encrypt(byte[] buffer) {
    int nLen = buffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$300(buffer, nI);
      lTemp = this.encryptBlockCBC(lTemp);
      Blowfish.access$400(lTemp, buffer, nI);
      int nI = nI + 8;
    }
  }

  public void encrypt(int[] inbuffer, int[] outbuffer) {
    int nLen = inbuffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$500(inbuffer, nI);
      lTemp = this.encryptBlockCBC(lTemp);
      Blowfish.access$600(lTemp, outbuffer, nI);
      int nI = nI + 2;
    }
  }

  public void encrypt(int[] buffer) {
    int nLen = buffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$500(buffer, nI);
      lTemp = this.encryptBlockCBC(lTemp);
      Blowfish.access$600(lTemp, buffer, nI);
      int nI = nI + 2;
    }
  }

  public void encrypt(long[] inbuffer, long[] outbuffer) {
    int nLen = inbuffer.length;
    while (nI < nLen) {
      outbuffer[nI] = this.encryptBlockCBC(inbuffer[nI]);
      int nI = nI + 1;
    }
  }

  public void encrypt(long[] buffer) {
    int nLen = buffer.length;
    while (nI < nLen) {
      buffer[nI] = this.encryptBlockCBC(buffer[nI]);
      int nI = nI + 1;
    }
  }

  public void decrypt(byte[] inbuffer, byte[] outbuffer) {
    int nLen = inbuffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$300(inbuffer, nI);
      lTemp = this.decryptBlockCBC(lTemp);
      Blowfish.access$400(lTemp, outbuffer, nI);
      int nI = nI + 8;
    }
  }

  public void decrypt(byte[] buffer) {
    int nLen = buffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$300(buffer, nI);
      lTemp = this.decryptBlockCBC(lTemp);
      Blowfish.access$400(lTemp, buffer, nI);
      int nI = nI + 8;
    }
  }

  public void decrypt(int[] inbuffer, int[] outbuffer) {
    int nLen = inbuffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$500(inbuffer, nI);
      lTemp = this.decryptBlockCBC(lTemp);
      Blowfish.access$600(lTemp, outbuffer, nI);
      int nI = nI + 2;
    }
  }

  public void decrypt(int[] buffer) {
    int nLen = buffer.length;
    while (nI < nLen) {
      long lTemp = Blowfish.access$500(buffer, nI);
      lTemp = this.decryptBlockCBC(lTemp);
      Blowfish.access$600(lTemp, buffer, nI);
      int nI = nI + 2;
    }
  }

  public void decrypt(long[] inbuffer, long[] outbuffer) {
    int nLen = inbuffer.length;
    while (nI < nLen) {
      outbuffer[nI] = this.decryptBlockCBC(inbuffer[nI]);
      int nI = nI + 1;
    }
  }

  public void decrypt(long[] buffer) {
    int nLen = buffer.length;
    while (nI < nLen) {
      buffer[nI] = this.decryptBlockCBC(buffer[nI]);
      int nI = nI + 1;
    }
  }
}
