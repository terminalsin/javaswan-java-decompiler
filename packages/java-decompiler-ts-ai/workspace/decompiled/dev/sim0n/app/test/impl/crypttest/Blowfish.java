package dev.sim0n.app.test.impl.crypttest;

import java.security.MessageDigest;
import java.util.Random;

public class Blowfish {
    private Blowfish$BlowfishCBC m_bfish;
    private static Random m_rndGen;
    private static final char[] HEXTAB;

    public Blowfish(String password) {
        MessageDigest digest = null;
        try {
            digest = MessageDigest.getInstance("SHA1");
            digest.update(password.getBytes());
        } catch (Exception e) {
        }
        this.m_bfish = new Blowfish$BlowfishCBC(digest.digest(), 0);
        digest.reset();
    }

    public String encryptString(String sPlainText) {
        long lCBCIV = m_rndGen.nextLong();
        return encStr(sPlainText, lCBCIV);
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
        byte padding = (byte) (buf.length - (nStrLen << 1));
        while (nPos < buf.length) {
            nPos++;
            buf[nPos] = padding;
        }
        this.m_bfish.setCBCIV(lNewCBCIV);
        this.m_bfish.encrypt(buf);
        return bytesToBinHex(buf, 0, buf.length);
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
            this.m_bfish.setCBCIV(cbciv);
            this.m_bfish.decrypt(buf);
            return new String(buf);
        }
        return null;
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
            boolean blConvertOK = true;
            for (int nJ = 0; nJ < 2; nJ++) {
                bActByte = (byte) (bActByte << 4);
                nSrcPos++;
                char cActChar = sBinHex.charAt(nSrcPos);
                if (cActChar < 97 || cActChar > 102) {
                    if (cActChar < 48 || cActChar > 57) {
                        blConvertOK = false;
                    } else {
                        bActByte = (byte) (bActByte | (byte) (cActChar - 48));
                    }
                } else {
                    bActByte = (byte) (bActByte | (byte) (cActChar - 97) + 10);
                }
            }
            if (blConvertOK) {
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

    static {
        m_rndGen = new Random();
        char[] tmpArray12 = new char[16];
        tmpArray12[0] = 48;
        tmpArray12[1] = 49;
        tmpArray12[2] = 50;
        tmpArray12[3] = 51;
        tmpArray12[4] = 52;
        tmpArray12[5] = 53;
        tmpArray12[6] = 54;
        tmpArray12[7] = 55;
        tmpArray12[8] = 56;
        tmpArray12[9] = 57;
        tmpArray12[10] = 97;
        tmpArray12[11] = 98;
        tmpArray12[12] = 99;
        tmpArray12[13] = 100;
        tmpArray12[14] = 101;
        tmpArray12[15] = 102;
        HEXTAB = tmpArray12;
    }
}