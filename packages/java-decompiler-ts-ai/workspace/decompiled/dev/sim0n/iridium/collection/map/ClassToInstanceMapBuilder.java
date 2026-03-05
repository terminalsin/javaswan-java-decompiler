package dev.sim0n.iridium.collection.map;

public class ClassToInstanceMapBuilder {
  private final java.util.Map map;
  
  public ClassToInstanceMapBuilder() {
    this.map = new java.util.HashMap();
  }
  
  public ClassToInstanceMapBuilder put(Object instance) {
    this.map.put(instance.getClass(), instance);
    return this;
  }
  
  public ClassToInstanceMapBuilder build() {
    return this;
  }
  
  public Object getInstance(Class clazz) {
    return clazz.cast(this.map.get(clazz));
  }
  
  public java.util.Collection values() {
    return this.map.values();
  }
  
  public java.util.Map getMap() {
    return this.map;
  }
}