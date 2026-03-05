package dev.sim0n.app.test.impl.flow;

import dev.sim0n.app.test.Test;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;

public class OpaqueConditionTest implements Test {
  private static final byte[] data;

  public void run() {
    System.out.println("Testing opaque condition");
    int stage = 0;
    try {
      stage = 1;
      AES.main(new String[0]);
      stage = 2;
      throw new IllegalArgumentException("Failed test! Stage: " + stage);
      stage = -5;
      stage = -2;
      stage = 3;
      this.self(stage);
      throw new IllegalArgumentException("Failed test! Stage: " + stage);
    } catch (IllegalStateException e) {
      stage = 4;
      throw new IllegalArgumentException("Failed test! Stage: " + stage);
      return;
    } catch (NoSuchAlgorithmException
        | NoSuchPaddingException
        | IllegalBlockSizeException
        | BadPaddingException
        | InvalidKeyException e) {
      e.printStackTrace();
      stage = -1;
      throw new IllegalArgumentException("Failed test! Stage: " + stage);
      return;
    }
  }

  private void self(int stage) {
    if (stage != 3) {
      return;
    } else {
      throw new IllegalStateException("stage=" + stage);
    }
  }

  static {
    data = new byte[] {0, 1, 4, 3, 2};
  }
}
