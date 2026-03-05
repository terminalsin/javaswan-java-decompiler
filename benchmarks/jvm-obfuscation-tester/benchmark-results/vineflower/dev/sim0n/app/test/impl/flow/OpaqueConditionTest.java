package dev.sim0n.app.test.impl.flow;

import dev.sim0n.app.test.Test;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;

public class OpaqueConditionTest implements Test {
  private static final byte[] data = new byte[] {0, 1, 4, 3, 2};

  @Override
  public void run() {
    System.out.println("Testing opaque condition");
    int stage = 0;

    try {
      int var6 = 1;
      AES.main(new String[0]);
      var6 = 2;
      if (data[0] == 0) {
        switch (data[1]) {
          case 0:
            var6 = -2;
            break;
          case 1:
            var6 = 3;
            break;
          default:
            var6 = -5;
        }

        this.self(var6);
        throw new IllegalArgumentException("Failed test! Stage: " + var6);
      }

      throw new IllegalArgumentException("Failed test! Stage: " + var6);
    } catch (IllegalStateException var3) {
      var5 = 4;
    } catch (NoSuchPaddingException
        | IllegalBlockSizeException
        | BadPaddingException
        | InvalidKeyException
        | NoSuchAlgorithmException var4) {
      var4.printStackTrace();
      var5 = -1;
    }

    if (data[2] != var5) {
      throw new IllegalArgumentException("Failed test! Stage: " + var5);
    }
  }

  private void self(int stage) {
    if (stage == 3) {
      throw new IllegalStateException("stage=" + stage);
    }
  }
}
