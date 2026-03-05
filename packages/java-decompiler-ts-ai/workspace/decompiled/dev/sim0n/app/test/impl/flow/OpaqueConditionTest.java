package dev.sim0n.app.test.impl.flow;

public class OpaqueConditionTest implements dev.sim0n.app.test.Test {
  private static final byte[] data;
  
  public void run() {
    System.out.println("Testing opaque condition");
    int stage = 0;
    try {
      stage = 1;
      AES.main(new String[0]);
      stage = 2;
      throw new IllegalArgumentException(new StringBuilder().append("Failed test! Stage: ").append(stage).toString());
      stage = -5;
      stage = -2;
      stage = 3;
      this.self(stage);
      throw new IllegalArgumentException(new StringBuilder().append("Failed test! Stage: ").append(stage).toString());
    } catch (IllegalStateException e) {
      stage = 4;
      throw new IllegalArgumentException(new StringBuilder().append("Failed test! Stage: ").append(stage).toString());
      return;
    } catch (java.security.NoSuchAlgorithmException e) {
      e.printStackTrace();
      stage = -1;
      throw new IllegalArgumentException(new StringBuilder().append("Failed test! Stage: ").append(stage).toString());
      return;
    } catch (javax.crypto.NoSuchPaddingException e) {
      e.printStackTrace();
      stage = -1;
      throw new IllegalArgumentException(new StringBuilder().append("Failed test! Stage: ").append(stage).toString());
      return;
    } catch (javax.crypto.IllegalBlockSizeException e) {
      e.printStackTrace();
      stage = -1;
      throw new IllegalArgumentException(new StringBuilder().append("Failed test! Stage: ").append(stage).toString());
      return;
    } catch (javax.crypto.BadPaddingException e) {
      e.printStackTrace();
      stage = -1;
      throw new IllegalArgumentException(new StringBuilder().append("Failed test! Stage: ").append(stage).toString());
      return;
    } catch (java.security.InvalidKeyException e) {
      e.printStackTrace();
      stage = -1;
      throw new IllegalArgumentException(new StringBuilder().append("Failed test! Stage: ").append(stage).toString());
      return;
    }
  }
  
  private void self(int stage) {
    if (stage != 3) {
      return;
    } else {
      throw new IllegalStateException(new StringBuilder().append("stage=").append(stage).toString());
    }
  }
  
  static {
    tmpArray13 = new byte[5];
    tmpArray13[0] = 0;
    tmpArray13[1] = 1;
    tmpArray13[2] = 4;
    tmpArray13[3] = 3;
    tmpArray13[4] = 2;
    data = tmpArray13;
  }
}